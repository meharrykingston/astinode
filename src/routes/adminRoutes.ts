import type { FastifyInstance } from "fastify";
import User, { USER_ROLES } from "../models/User.js";
import Page from "../models/Page.js";
import Log from "../models/Log.js";
import { hashPassword } from "../utils/auth.js";
import { requireSuperadmin } from "../utils/authMiddleware.js";
import { logEvent } from "../services/logService.js";
import { runJobNow } from "../services/cronService.js";

type CreateUserBody = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  password?: unknown;
};

type UpdateUserBody = {
  name?: unknown;
  role?: unknown;
  status?: unknown;
};

type ResetPasswordBody = {
  password?: unknown;
};

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get("/api/admin/summary", async (request, reply) => {
    try {
      requireSuperadmin(request);
    } catch (error) {
      reply.code(401);
      return { message: "Unauthorized" };
    }

    const [totalPages, publishedPages, draftPages, approvedPages, totalSeoUsers, totalLogs] =
      await Promise.all([
        Page.countDocuments({}),
        Page.countDocuments({ status: "published" }),
        Page.countDocuments({ status: "draft" }),
        Page.countDocuments({ status: "approved" }),
        User.countDocuments({ role: { $ne: "superadmin" } }),
        Log.countDocuments({}),
      ]);

    return {
      pages: {
        total: totalPages,
        published: publishedPages,
        draft: draftPages,
        approved: approvedPages,
      },
      users: {
        seoTotal: totalSeoUsers,
      },
      logs: {
        total: totalLogs,
      },
    };
  });

  fastify.get("/api/admin/users", async (request, reply) => {
    try {
      requireSuperadmin(request);
    } catch {
      reply.code(401);
      return { message: "Unauthorized" };
    }

    const users = await User.find({ role: { $ne: "superadmin" } })
      .sort({ createdAt: -1 })
      .lean();
    return {
      users: users.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
    };
  });

  fastify.post<{ Body: CreateUserBody }>("/api/admin/users", async (request, reply) => {
    try {
      requireSuperadmin(request);
    } catch {
      reply.code(401);
      return { message: "Unauthorized" };
    }

    const body = request.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const role = String(body.role || "seo_viewer").trim();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      reply.code(400);
      return { message: "Email and password required" };
    }

    if (!USER_ROLES.includes(role as any) || role === "superadmin") {
      reply.code(400);
      return { message: "Invalid role" };
    }

    const passwordHash = await hashPassword(password);

    const created = await User.create({
      email,
      name,
      role,
      passwordHash,
      status: "active",
    });

    await logEvent("info", "SEO user created", {
      source: "backend",
      userId: String(created._id),
      email,
      role,
    });

    reply.code(201);
    return {
      user: {
        id: String(created._id),
        name: created.name,
        email: created.email,
        role: created.role,
        status: created.status,
        createdAt: created.createdAt,
      },
    };
  });

  fastify.put<{ Params: { id: string }; Body: UpdateUserBody }>(
    "/api/admin/users/:id",
    async (request, reply) => {
      try {
        requireSuperadmin(request);
      } catch {
        reply.code(401);
        return { message: "Unauthorized" };
      }

      const id = String(request.params.id || "").trim();
      const body = request.body || {};
      const updates: Record<string, unknown> = {};

      if (body.name !== undefined) updates.name = String(body.name || "").trim();
      if (body.status !== undefined) updates.status = String(body.status || "active").trim();

      if (body.role !== undefined) {
        const role = String(body.role || "").trim();
        if (!USER_ROLES.includes(role as any) || role === "superadmin") {
          reply.code(400);
          return { message: "Invalid role" };
        }
        updates.role = role;
      }

      const updated = await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
      if (!updated) {
        reply.code(404);
        return { message: "User not found" };
      }

      await logEvent("info", "SEO user updated", {
        source: "backend",
        userId: String(updated._id),
        role: updated.role,
        status: updated.status,
      });

      return {
        user: {
          id: String(updated._id),
          name: updated.name,
          email: updated.email,
          role: updated.role,
          status: updated.status,
          createdAt: updated.createdAt,
          lastLoginAt: updated.lastLoginAt,
        },
      };
    },
  );

  fastify.delete<{ Params: { id: string } }>("/api/admin/users/:id", async (request, reply) => {
    try {
      requireSuperadmin(request);
    } catch {
      reply.code(401);
      return { message: "Unauthorized" };
    }

    const id = String(request.params.id || "").trim();
    const removed = await User.findByIdAndDelete(id);
    if (!removed) {
      reply.code(404);
      return { message: "User not found" };
    }

    await logEvent("info", "SEO user deleted", {
      source: "backend",
      userId: String(removed._id),
      email: removed.email,
    });

    return { ok: true };
  });

  fastify.post<{ Params: { id: string }; Body: ResetPasswordBody }>(
    "/api/admin/users/:id/reset-password",
    async (request, reply) => {
      try {
        requireSuperadmin(request);
      } catch {
        reply.code(401);
        return { message: "Unauthorized" };
      }

      const id = String(request.params.id || "").trim();
      const body = request.body || {};
      const password = String(body.password || "").trim();
      if (!password) {
        reply.code(400);
        return { message: "Password required" };
      }

      const passwordHash = await hashPassword(password);
      const updated = await User.findByIdAndUpdate(id, { $set: { passwordHash } }, { new: true });
      if (!updated) {
        reply.code(404);
        return { message: "User not found" };
      }

      await logEvent("warn", "SEO user password reset", {
        source: "backend",
        userId: String(updated._id),
      });

      return { ok: true };
    },
  );

  fastify.get("/api/admin/logs", async (request, reply) => {
    try {
      requireSuperadmin(request);
    } catch {
      reply.code(401);
      return { message: "Unauthorized" };
    }

    const { level, source } = request.query as { level?: string; source?: string };
    const filter: Record<string, unknown> = {};
    if (level) filter.level = level;
    if (source) filter.source = source;

    const logs = await Log.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return {
      logs: logs.map((log) => ({
        id: String(log._id),
        level: log.level,
        source: log.source,
        message: log.message,
        createdAt: log.createdAt,
        meta: log.meta,
      })),
    };
  });

  fastify.post<{ Params: { job: string } }>("/api/admin/jobs/:job", async (request, reply) => {
    try {
      requireSuperadmin(request);
    } catch {
      reply.code(401);
      return { message: "Unauthorized" };
    }

    const job = String(request.params.job || "").trim();
    if (job !== "sitemap" && job !== "cleanup") {
      reply.code(400);
      return { message: "Invalid job" };
    }

    await runJobNow(job as "sitemap" | "cleanup");
    return { ok: true };
  });
}
