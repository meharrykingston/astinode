import type { FastifyPluginAsync } from "fastify";
import { getDiagnosticStep } from "../controllers/diagnoseController.js";

type DiagnoseBody = {
  chatHistory?: Array<{
    role?: "user" | "assistant";
    content?: string;
  }>;
};

const diagnoseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: DiagnoseBody }>("/api/diagnose", getDiagnosticStep);
};

export default diagnoseRoutes;
