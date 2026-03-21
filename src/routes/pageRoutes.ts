import type { FastifyInstance } from "fastify";
import Page from "../models/Page.js";
import {
  ensureKindBasedSlug,
  mapPage,
  normalizePageKind,
  normalizeSections,
  normalizeSlug,
  parseLines,
} from "../utils/helpers.js";

type PageBody = {
  pageKind?: unknown;
  overview?: unknown;
  sections?: unknown;
  content?: unknown;
  quickAnswer?: unknown;
  titleTag?: unknown;
  metaTag?: unknown;
  metaDescription?: unknown;
  h1Heading?: unknown;
  url?: unknown;
  status?: unknown;
  author?: unknown;
  targetKeyword?: unknown;
  headingStructure?: {
    h1?: unknown;
    h2?: unknown;
    h3?: unknown;
  };
  keywordPlacement?: unknown;
  altText?: unknown;
  imageAltText?: unknown;
  internalLinks?: unknown;
};

type PublishBody = {
  id?: unknown;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatToHtml(text: unknown): string {
  const raw = String(text || "").trim();
  if (!raw) return "";

  if (/<\/?[a-z][\s\S]*>/i.test(raw)) {
    return raw;
  }

  const normalized = raw.replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const htmlParts: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const isBulletBlock = lines.every((line) => /^-\s+/.test(line));
    if (isBulletBlock) {
      const listItems = lines.map((line) => `<li>${escapeHtml(line.replace(/^-+\s*/, "").trim())}</li>`).join("");
      htmlParts.push(`<ul>${listItems}</ul>`);
      continue;
    }

    htmlParts.push(`<p>${escapeHtml(lines.join(" "))}</p>`);
  }

  return htmlParts.join("\n");
}

function buildPayload(body: PageBody, includeCreatedAt = false) {
  const pageKind = normalizePageKind(body.pageKind);
  const url = ensureKindBasedSlug(body.url, pageKind);
  const sections = normalizeSections(body.sections).map((section) => ({
    ...section,
    body: formatToHtml(section.body),
  }));
  const h1Heading = String(body.h1Heading || body.headingStructure?.h1 || "").trim();
  const titleTag = String(body.titleTag || h1Heading).trim();
  const metaDescription = String(body.metaDescription || body.overview || "").trim();
  const altText = parseLines(body.altText);

  const payload: Record<string, unknown> = {
    pageKind,
    overview: String(body.overview || "").trim(),
    sections,
    content: String(body.content || sections.map((section) => section.body).join("\n\n---\n\n")).trim(),
    quickAnswer: String(body.quickAnswer || "").trim(),
    titleTag,
    metaTag: String(body.metaTag || "").trim(),
    metaDescription,
    h1Heading,
    url,
    status: body.status === "published" ? "published" : "draft",
    author: String(body.author || "SEO Team").trim(),
    targetKeyword: String(body.targetKeyword || "").trim(),
    headingStructure: {
      h1: h1Heading,
      h2: sections.length > 0 ? sections.map((section) => section.heading).filter(Boolean) : parseLines(body.headingStructure?.h2),
      h3: parseLines(body.headingStructure?.h3),
    },
    keywordPlacement: parseLines(body.keywordPlacement),
    altText,
    imageAltText: parseLines(body.imageAltText).length > 0 ? parseLines(body.imageAltText) : altText,
    internalLinks: parseLines(body.internalLinks).map(normalizeSlug),
  };

  if (includeCreatedAt) {
    payload.views = 0;
  }

  return { payload, url };
}

export default async function pageRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { skip?: string; limit?: string } }>(
    "/api/pages",
    async (request) => {
      const skip = parseInt(request.query.skip || "0");
      const limit = parseInt(request.query.limit || "50000");

      // Database se specific 'slice' uthao
      const docs = await Page.find({})
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Frontend ko data wapas bhejo
      return { pages: docs.map(mapPage) };
    }
  );

  fastify.get("/api/pages/count", async () => {
    const count = await Page.countDocuments(); // MongoDB ka inbuilt function
    return { total: count };
  });

  // Fastify Route
  fastify.delete("/api/pages/bulk-delete", async (request, reply) => {
    const { ids } = request.body as { ids: string[] };

    if (!ids || ids.length === 0) {
      return reply.code(400).send({ message: "No IDs provided" });
    }

    // MongoDB ka deleteMany use karo for high speed
    const result = await Page.deleteMany({ _id: { $in: ids } });

    return {
      success: true,
      deletedCount: result.deletedCount
    };
  });

  fastify.get<{ Querystring: { slug?: string } }>("/api/pages/resolve", async (request, reply) => {
    const slug = normalizeSlug(request.query?.slug || "/");
    const doc = await Page.findOne({ url: slug }).lean();

    if (!doc) {
      reply.code(404);
      return { message: "Page not found" };
    }

    return { page: mapPage(doc) };
  });

  fastify.post<{ Body: PageBody }>("/api/pages", async (request, reply) => {
    const body = request.body || {};
    const { payload, url } = buildPayload(body, true);

    if (url === "/") {
      reply.code(400);
      return { message: "URL '/' cannot be generated as a physical page. Use a custom path like /headache-relief" };
    }

    try {
      const created = await Page.create(payload);
      reply.code(201);
      return { page: mapPage(created.toObject()) };
    } catch (error: any) {
      if (error?.code === 11000) {
        reply.code(409);
        return { message: "URL already exists" };
      }
      throw error;
    }
  });

  fastify.post<{ Body: unknown }>("/api/pages/bulk-upload", async (request, reply) => {
    const input = request.body;
    if (!Array.isArray(input)) {
      reply.code(400);
      return { message: "Request body must be an array of page objects" };
    }

    const data: Record<string, unknown>[] = input
      .map((item) => buildPayload((item || {}) as PageBody, true))
      .filter(({ url }) => url !== "/")
      .map(({ payload }) => payload);

    if (data.length === 0) {
      reply.code(400);
      return { message: "No valid pages to insert" };
    }

    try {
      const inserted = await Page.insertMany(data, { ordered: false });
      reply.code(201);
      return {
        ok: true,
        received: input.length,
        attempted: data.length,
        inserted: inserted.length,
        skipped: data.length - inserted.length,
      };
    } catch (error: any) {
      const insertedCount = Array.isArray(error?.insertedDocs) ? error.insertedDocs.length : 0;
      const writeErrors = Array.isArray(error?.writeErrors) ? error.writeErrors : [];
      const duplicateCount = writeErrors.filter((writeError: any) => writeError?.code === 11000).length;
      const failedCount = writeErrors.length;

      reply.code(207);
      return {
        ok: true,
        message: "Bulk upload completed with partial success",
        received: input.length,
        attempted: data.length,
        inserted: insertedCount,
        duplicates: duplicateCount,
        failed: failedCount,
        skipped: data.length - insertedCount,
      };
    }
  });

  fastify.post<{ Body: PublishBody }>("/api/pages/publish", async (request, reply) => {
    const body = request.body || {};
    const id = String(body.id || "").trim();
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      reply.code(400);
      return { message: "Provide a valid page id to publish" };
    }

    const updated = await Page.findOneAndUpdate(
      { _id: id },
      { $set: { status: "published" } },
      { new: true, runValidators: false },
    );

    if (!updated) {
      reply.code(404);
      return { message: "Page not found" };
    }

    return { page: mapPage(updated.toObject()) };
  });

  fastify.put<{ Params: { id: string }; Body: PageBody }>("/api/pages/:id", async (request, reply) => {
    const { id } = request.params;
    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      reply.code(400);
      return { message: "Invalid page id" };
    }

    const body = request.body || {};
    const { payload, url } = buildPayload(body, false);

    if (url === "/") {
      reply.code(400);
      return { message: "URL '/' cannot be generated as a physical page. Use a custom path like /headache-relief" };
    }

    try {
      const updated = await Page.findByIdAndUpdate(id, { $set: payload }, { new: true });
      if (!updated) {
        reply.code(404);
        return { message: "Page not found" };
      }

      return { page: mapPage(updated.toObject()) };
    } catch (error: any) {
      if (error?.code === 11000) {
        reply.code(409);
        return { message: "URL already exists" };
      }
      throw error;
    }
  });

  fastify.delete<{ Params: { id: string } }>("/api/pages/:id", async (request, reply) => {
    const { id } = request.params;
    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      reply.code(400);
      return { message: "Invalid page id" };
    }

    const deleted = await Page.findByIdAndDelete(id);
    if (!deleted) {
      reply.code(404);
      return { message: "Page not found" };
    }

    return { ok: true };
  });
}

