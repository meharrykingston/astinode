import type { FastifyInstance } from "fastify";
import User from "../models/User.js";
import { signToken, verifyPassword } from "../utils/auth.js";
import { logEvent } from "../services/logService.js";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: LoginBody }>("/api/auth/login", async (request, reply) => {
    const body = request.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      reply.code(400);
      return { message: "Email and password required" };
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
      reply.code(401);
      return { message: "Invalid credentials" };
    }

    if (user.status === "disabled") {
      reply.code(403);
      return { message: "User is disabled" };
    }

    if (user.role !== "superadmin") {
      reply.code(403);
      return { message: "Superadmin access required" };
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      reply.code(401);
      return { message: "Invalid credentials" };
    }

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    await logEvent("info", "Superadmin login", {
      source: "backend",
      userId: String(user._id),
      email,
    });

    const token = signToken({ userId: String(user._id), role: user.role });
    return {
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  });

  fastify.post<{ Body: LoginBody }>("/api/seo/auth/login", async (request, reply) => {
    const body = request.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      reply.code(400);
      return { message: "Email and password required" };
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
      reply.code(401);
      return { message: "Invalid credentials" };
    }

    if (user.status === "disabled") {
      reply.code(403);
      return { message: "User is disabled" };
    }

    if (user.role === "superadmin") {
      reply.code(403);
      return { message: "Use superadmin login" };
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      reply.code(401);
      return { message: "Invalid credentials" };
    }

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    await logEvent("info", "SEO user login", {
      source: "backend",
      userId: String(user._id),
      email,
      role: user.role,
    });

    const token = signToken({ userId: String(user._id), role: user.role });
    return {
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  });

  fastify.get("/api/seo/auth/me", async (request, reply) => {
    const header = request.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      reply.code(401);
      return { message: "Missing token" };
    }

    try {
      const payload = verifyToken(token);
      const user = await User.findById(payload.userId).lean();
      if (!user) {
        reply.code(401);
        return { message: "Invalid token" };
      }

      if (user.role === "superadmin") {
        reply.code(403);
        return { message: "Forbidden" };
      }

      if (user.status === "disabled") {
        reply.code(403);
        return { message: "User is disabled" };
      }

      return {
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch {
      reply.code(401);
      return { message: "Invalid token" };
    }
  });
}
