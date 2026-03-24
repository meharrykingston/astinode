import type { FastifyReply, FastifyRequest } from "fastify";
import Blog from "../models/Blog.js";

type BlogBody = Record<string, unknown>;

type BulkUploadRequest = FastifyRequest<{ Body: BlogBody[] }>;
type UpsertBlogRequest = FastifyRequest<{ Body: BlogBody & { id?: unknown } }>;
type GetBySlugRequest = FastifyRequest<{ Params: { slug: string } }>;

type BulkWriteLikeError = {
  name?: string;
  writeErrors?: Array<{ code?: number }>;
  insertedDocs?: unknown[];
};

type MongooseLikeError = {
  code?: number;
  name?: string;
};

export async function bulkUploadBlogs(request: BulkUploadRequest, reply: FastifyReply) {
  const input = request.body;

  if (!Array.isArray(input)) {
    return reply.code(400).send({ message: "Request body must be an array of blog objects" });
  }

  try {
    const inserted = await Blog.insertMany(input, { ordered: false });
    return reply.code(201).send({ message: "Bulk upload successful", count: inserted.length });
  } catch (error: unknown) {
    const bulkError = error as BulkWriteLikeError;
    const isBulkWriteError = bulkError?.name === "MongoBulkWriteError" || Array.isArray(bulkError?.writeErrors);

    if (isBulkWriteError) {
      const insertedCount = Array.isArray(bulkError.insertedDocs) ? bulkError.insertedDocs.length : 0;
      const failedCount = Array.isArray(bulkError.writeErrors) ? bulkError.writeErrors.length : input.length - insertedCount;

      return reply.code(207).send({
        message: "Bulk upload completed with partial success",
        inserted: insertedCount,
        failed: failedCount,
      });
    }

    throw error;
  }
}

export async function upsertBlog(request: UpsertBlogRequest, reply: FastifyReply) {
  const body = request.body || {};
  const id = String(body.id || "").trim();
  const payload: Record<string, any> = { ...body };
  delete (payload as { id?: unknown }).id;

  if (payload.metaTitle !== undefined) payload.metaTitle = String(payload.metaTitle || "").trim();
  if (payload.metaDescription !== undefined) payload.metaDescription = String(payload.metaDescription || "").trim();
  if (payload.keywords !== undefined) {
    payload.keywords = Array.isArray(payload.keywords)
      ? payload.keywords.map((item: unknown) => String(item || "").trim()).filter(Boolean)
      : String(payload.keywords || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
  }
  if (payload.backlinks !== undefined) {
    payload.backlinks = Array.isArray(payload.backlinks)
      ? payload.backlinks.map((item: unknown) => String(item || "").trim()).filter(Boolean)
      : String(payload.backlinks || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
  }

  if (id && !/^[a-fA-F0-9]{24}$/.test(id)) {
    return reply.code(400).send({ message: "Invalid blog id" });
  }

  try {
    if (id) {
      const updated = await Blog.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true });

      if (!updated) {
        return reply.code(404).send({ message: "Blog not found" });
      }

      return reply.send(updated);
    }

    const created = await Blog.create(payload);
    return reply.code(201).send(created);
  } catch (error: unknown) {
    const mongoError = error as MongooseLikeError;

    if (mongoError?.code === 11000) {
      return reply.code(409).send({ message: "Slug already exists" });
    }

    if (mongoError?.name === "ValidationError") {
      return reply.code(400).send({ message: "Invalid blog data" });
    }

    throw error;
  }
}

export async function getAllBlogs(_request: FastifyRequest, reply: FastifyReply) {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  return reply.send(blogs);
}

export async function getBlogBySlug(request: GetBySlugRequest, reply: FastifyReply) {
  const { slug } = request.params;
  const blog = await Blog.findOne({ slug });

  if (!blog) {
    return reply.code(404).send({ message: "Blog not found" });
  }

  return reply.send(blog);
}
