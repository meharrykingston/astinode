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

type CompleteResponse = {
  status: "complete";
  summary: string;
};

type DiagnosticResponse = AskingResponse | CompleteResponse;

type DiagnoseRequest = FastifyRequest<{ Body: DiagnoseBody }>;

const MODEL = "grok-4-1-fast-reasoning";
const SYSTEM_PROMPT = `You are the Astikan AI. Analyze symptoms.
You MUST respond in JSON ONLY.
Every follow-up MUST have exactly 4 short options.
If triage is complete, provide a summary.

JSON contract:
- Asking: { "status": "asking", "question": "string", "options": ["opt1", "opt2", "opt3", "opt4"] }
- Complete: { "status": "complete", "summary": "string" }`;

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
  const summary = String(data.summary || "").trim();
  if (!summary) return null;

  return {
    status: "complete",
    summary,
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
  const modelName = process.env.GROK_MODEL || "grok-4-1-fast-reasoning";
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
    // Hard Limit: Force complete after 6 questions
    if (sanitizedHistory.length >= 13) {
      sanitizedHistory.push({ 
        role: "system", 
        content: "MAX LIMIT REACHED. You have asked 6 questions. You MUST output status: 'complete' and provide the final summary now. DO NOT ASK ANY MORE QUESTIONS." 
      });
    }

    const completion = await grokClient.chat.completions.create({
      model: modelName,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...sanitizedHistory],
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
