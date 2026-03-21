import Page from "../models/Page.js";
import { ensureKindBasedSlug, mapPage, normalizePageKind, normalizeSections, normalizeSlug, parseLines, } from "../utils/helpers.js";
function escapeHtml(input) {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function formatToHtml(text) {
    const raw = String(text || "").trim();
    if (!raw)
        return "";
    if (/<\/?[a-z][\s\S]*>/i.test(raw)) {
        return raw;
    }
    const normalized = raw.replace(/\r\n/g, "\n");
    const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    const htmlParts = [];
    for (const block of blocks) {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0)
            continue;
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
function buildPayload(body, includeCreatedAt = false) {
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
    const payload = {
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
export default async function pageRoutes(fastify) {
    fastify.get("/api/pages", async () => {
        const docs = await Page.find({}).sort({ updatedAt: -1 }).lean();
        return { pages: docs.map(mapPage) };
    });
    fastify.get("/api/pages/resolve", async (request, reply) => {
        const slug = normalizeSlug(request.query?.slug || "/");
        const doc = await Page.findOne({ url: slug }).lean();
        if (!doc) {
            reply.code(404);
            return { message: "Page not found" };
        }
        return { page: mapPage(doc) };
    });
    fastify.post("/api/pages", async (request, reply) => {
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
        }
        catch (error) {
            if (error?.code === 11000) {
                reply.code(409);
                return { message: "URL already exists" };
            }
            throw error;
        }
    });
    fastify.post("/api/pages/bulk-upload", async (request, reply) => {
        const input = request.body;
        if (!Array.isArray(input)) {
            reply.code(400);
            return { message: "Request body must be an array of page objects" };
        }
        const data = input
            .map((item) => buildPayload((item || {}), true))
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
        }
        catch (error) {
            const insertedCount = Array.isArray(error?.insertedDocs) ? error.insertedDocs.length : 0;
            const writeErrors = Array.isArray(error?.writeErrors) ? error.writeErrors : [];
            const duplicateCount = writeErrors.filter((writeError) => writeError?.code === 11000).length;
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
    fastify.post("/api/pages/publish", async (request, reply) => {
        const body = request.body || {};
        const id = String(body.id || "").trim();
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            reply.code(400);
            return { message: "Provide a valid page id to publish" };
        }
        const updated = await Page.findOneAndUpdate({ _id: id }, { $set: { status: "published" } }, { new: true, runValidators: false });
        if (!updated) {
            reply.code(404);
            return { message: "Page not found" };
        }
        return { page: mapPage(updated.toObject()) };
    });
    fastify.put("/api/pages/:id", async (request, reply) => {
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
        }
        catch (error) {
            if (error?.code === 11000) {
                reply.code(409);
                return { message: "URL already exists" };
            }
            throw error;
        }
    });
    fastify.delete("/api/pages/:id", async (request, reply) => {
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
//# sourceMappingURL=pageRoutes.js.map