import type { FastifyReply, FastifyRequest } from "fastify";
import OpenAI from "openai";

type ChatHistoryMessage = {
  role?: unknown;
  content?: unknown;
};

type DiagnoseBody = {
  chatHistory?: unknown;
};

type AskingResponse = {
  status: "asking";
  question: string;
  options: [string, string, string, string];
};

type Severity = "Low" | "Moderate" | "High" | "Critical";
type StoryZone = "head" | "chest" | "stomach" | "lower_abdomen" | "left_arm" | "right_leg";

type TopCondition = {
  name: string;
  probability: string;
  explanation: string;
};

type StoryStep = {
  text: string;
  zone: StoryZone;
};

type Analysis = {
  summary: string;
  severity: Severity;
  recommended_specialist: string;
  top_conditions: TopCondition[];
  story_script: StoryStep[];
};

type CompleteResponse = {
  status: "complete";
  analysis: Analysis;
};

type DiagnosticResponse = AskingResponse | CompleteResponse;

type DiagnoseRequest = FastifyRequest<{ Body: DiagnoseBody }>;

const ALLOWED_ZONES: StoryZone[] = ["head", "chest", "stomach", "lower_abdomen", "left_arm", "right_leg"];
const ALLOWED_SEVERITIES: Severity[] = ["Low", "Moderate", "High", "Critical"];

const SYSTEM_PROMPT = `You are the Astikan AI triage assistant. Analyze symptoms and return JSON ONLY.

PHASE LOGIC (based on chatHistory length):
1) PHASE 1 (Asking): If chatHistory.length < 12, output status "asking" with exactly 1 question and exactly 4 short options.
2) PHASE 2 (Complete): If chatHistory.length >= 12, output status "complete" with full analysis.

When PHASE 2 is active, analysis.story_script is mandatory for a 25-second frontend animation:
- Include exactly 4 to 5 steps.
- Each step must explain biologically what is happening in the body related to symptoms.
- Each step must include a zone from this exact set only:
  head, chest, stomach, lower_abdomen, left_arm, right_leg

JSON contract:
- Asking:
  {
    "status": "asking",
    "question": "string",
    "options": ["opt1", "opt2", "opt3", "opt4"]
  }
- Complete:
  {
    "status": "complete",
    "analysis": {
      "summary": "string",
      "severity": "Low|Moderate|High|Critical",
      "recommended_specialist": "string",
      "top_conditions": [
        { "name": "string", "probability": "string", "explanation": "string" }
      ],
      "story_script": [
        { "text": "string", "zone": "head|chest|stomach|lower_abdomen|left_arm|right_leg" }
      ]
    }
  }`;

const FALLBACK_RESPONSE: AskingResponse = {
  status: "asking",
  question: "Which symptom is bothering you the most right now?",
  options: ["Fever", "Cough", "Body pain", "Breathing issue"],
};

function sanitizeChatHistory(chatHistory: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(chatHistory)) return [];

  return chatHistory
    .map((item) => {
      const message = (item || {}) as ChatHistoryMessage;
      const role = String(message.role || "").trim().toLowerCase();
      const content = String(message.content || "").trim();

      if (!content) return null;
      if (role !== "user" && role !== "assistant") return null;

      return {
        role,
        content,
      } as { role: "user" | "assistant"; content: string };
    })
    .filter((item): item is { role: "user" | "assistant"; content: string } => item !== null);
}

function normalizeAskingResponse(data: Record<string, unknown>): AskingResponse | null {
  const question = String(data.question || "").trim();
  const rawOptions = data.options;

  if (!question || !Array.isArray(rawOptions)) return null;

  const options = rawOptions.map((option) => String(option || "").trim()).filter(Boolean);
  if (options.length !== 4) return null;

  return {
    status: "asking",
    question,
    options: [options[0], options[1], options[2], options[3]],
  };
}

function normalizeCompleteResponse(data: Record<string, unknown>): CompleteResponse | null {
  const rawAnalysis = data.analysis;
  if (!rawAnalysis || typeof rawAnalysis !== "object") return null;

  const analysisData = rawAnalysis as Record<string, unknown>;
  const summary = String(analysisData.summary || "").trim();
  const severity = String(analysisData.severity || "").trim() as Severity;
  const recommendedSpecialist = String(analysisData.recommended_specialist || "").trim();
  const rawTopConditions = analysisData.top_conditions;
  const rawStoryScript = analysisData.story_script;

  if (!summary || !recommendedSpecialist) return null;
  if (!ALLOWED_SEVERITIES.includes(severity)) return null;
  if (!Array.isArray(rawTopConditions) || rawTopConditions.length === 0) return null;
  if (!Array.isArray(rawStoryScript) || rawStoryScript.length < 4 || rawStoryScript.length > 5) return null;

  const topConditions: TopCondition[] = rawTopConditions
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const condition = item as Record<string, unknown>;
      const name = String(condition.name || "").trim();
      const probability = String(condition.probability || "").trim();
      const explanation = String(condition.explanation || "").trim();
      if (!name || !probability || !explanation) return null;
      return { name, probability, explanation };
    })
    .filter((item): item is TopCondition => item !== null);

  if (topConditions.length === 0) return null;

  const storyScript: StoryStep[] = rawStoryScript
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const step = item as Record<string, unknown>;
      const text = String(step.text || "").trim();
      const zone = String(step.zone || "").trim() as StoryZone;
      if (!text || !ALLOWED_ZONES.includes(zone)) return null;
      return { text, zone };
    })
    .filter((item): item is StoryStep => item !== null);

  if (storyScript.length !== rawStoryScript.length) return null;

  return {
    status: "complete",
    analysis: {
      summary,
      severity,
      recommended_specialist: recommendedSpecialist,
      top_conditions: topConditions,
      story_script: storyScript,
    },
  };
}

function parseDiagnosticResponse(rawContent: string): DiagnosticResponse | null {
  const trimmed = rawContent.trim();
  if (!trimmed) return null;

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) return null;

    try {
      parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;

  const data = parsed as Record<string, unknown>;
  const status = String(data.status || "").trim().toLowerCase();

  if (status === "asking") return normalizeAskingResponse(data);
  if (status === "complete") return normalizeCompleteResponse(data);
  return null;
}

export async function getDiagnosticStep(request: DiagnoseRequest, reply: FastifyReply) {
  const body = request.body || {};
  const sanitizedHistory = sanitizeChatHistory(body.chatHistory);
  const apiKey = process.env.GROK_API_KEY;
  const modelName = process.env.GROK_MODEL || "grok-2-latest";
  const grokClient = apiKey
    ? new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.x.ai/v1",
      })
    : null;

  if (!grokClient) {
    request.log.error("GROK_API_KEY is not configured");
    return reply.code(200).send(FALLBACK_RESPONSE);
  }

  try {
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...sanitizedHistory,
    ];

    const userMessageCount = sanitizedHistory.filter((message) => message.role === "user").length;
    if (userMessageCount >= 6) {
      messages.push({
        role: "system",
        content:
          "CRITICAL: User has answered 6 questions. You are now TERMINATED from asking questions. You MUST return 'status: complete' with the full 'analysis' object immediately. Do not explain, do not apologize, just return the JSON.",
      });
    }

    const completion = await grokClient.chat.completions.create({
      model: modelName,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages,
    });

    const content = String(completion.choices?.[0]?.message?.content || "").trim();
    const parsed = parseDiagnosticResponse(content);

    if (!parsed) {
      request.log.warn({ content }, "Failed to parse diagnostic LLM response; using fallback");
      return reply.code(200).send(FALLBACK_RESPONSE);
    }

    return reply.code(200).send(parsed);
  } catch (error) {
    request.log.error({ error }, "Diagnostic LLM request failed");
    return reply.code(200).send(FALLBACK_RESPONSE);
  }
}

