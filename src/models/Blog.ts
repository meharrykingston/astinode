import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from "mongoose";

const BLOG_STATUSES = ["published", "draft", "scheduled"] as const;

const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    author: { type: String, default: "", trim: true },
    status: { type: String, enum: BLOG_STATUSES, default: "draft" },
    category: { type: String, default: "", trim: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    metaTitle: { type: String, default: "", trim: true },
    metaDescription: { type: String, default: "", trim: true },
    keywords: { type: [String], default: [] },
    backlinks: { type: [String], default: [] },
    views: { type: Number, default: 0 },
    seoScore: { type: Number, default: 0 },
    updatedAt: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: true, updatedAt: "updatedAtTimestamp" },
    versionKey: false,
    strict: true,
  },
);

type BlogSchemaType = InferSchemaType<typeof blogSchema>;
export type BlogDocument = HydratedDocument<BlogSchemaType>;
type BlogModelType = Model<BlogSchemaType>;

blogSchema.pre<BlogDocument>("save", function blogPreSave() {
  if (!this.slug || !this.slug.trim()) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

const Blog = (mongoose.models.Blog as BlogModelType) || mongoose.model<BlogSchemaType>("Blog", blogSchema, "blogs");

export default Blog;
