import type { FastifyPluginAsync } from "fastify";
import { bulkUploadBlogs, getAllBlogs, getBlogBySlug, upsertBlog } from "../controllers/blogController.js";

const blogRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/bulk", bulkUploadBlogs);
  fastify.post("/", upsertBlog);
  fastify.get("/", getAllBlogs);
  fastify.get("/:slug", getBlogBySlug);
  fastify.put("/:id", upsertBlog);
};

export default blogRoutes;
