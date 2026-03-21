import type { FastifyRequest } from "fastify";
import { verifyToken } from "./auth.js";

export type AuthContext = {
  userId: string;
  role: string;
};

export function getAuthPayload(request: FastifyRequest): AuthContext {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    throw new Error("Missing auth token");
  }
  return verifyToken(token);
}

export function requireSuperadmin(request: FastifyRequest): AuthContext {
  const payload = getAuthPayload(request);
  if (payload.role !== "superadmin") {
    throw new Error("Forbidden");
  }
  return payload;
}
