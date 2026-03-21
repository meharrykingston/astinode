import type { FastifyInstance } from "fastify";
import { logEvent } from "../services/logService.js";

type LogBody = {
  level?: unknown;
  message?: unknown;
  source?: unknown;
  meta?: unknown;
};

export default async function logRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: LogBody }>("/api/logs/ingest", async (request, reply) => {
    const body = request.body || {};
    const level = String(body.level || "info").trim();
    const message = String(body.message || "").trim();
    const source = String(body.source || "frontend").trim();
    const meta = typeof body.meta === "object" && body.meta ? (body.meta as Record<string, unknown>) : {};

    if (!message) {
      reply.code(400);
      return { message: "Message required" };
    }

    const safeLevel = level === "warn" || level === "error" ? level : "info";
    await logEvent(safeLevel, message, { ...meta, source });

    return { ok: true };
  });
}
