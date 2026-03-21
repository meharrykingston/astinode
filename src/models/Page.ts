import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from "mongoose";

const PAGE_KINDS = [
  "symptom",
  "disease",
  "medicine",
  "cause",
  "treatment",
  "procedure",
  "test",
  "wellness",
  "faq",
  "other",
] as const;

const PAGE_STATUSES = ["draft", "approved", "published"] as const;

const sectionSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    heading: { type: String, required: true, trim: true },
    headingType: { type: String, enum: ["h2", "h3"], required: true },
    body: { type: String, required: true, default: "" }, // HTML string
  },
  { _id: false },
);

const headingStructureSchema = new Schema(
  {
    h1: { type: String, default: "" },
    h2: { type: [String], default: [] },
    h3: { type: [String], default: [] },
  },
  { _id: false },
);

const pageSchema = new Schema(
  {
    pageKind: { type: String, enum: PAGE_KINDS, index: true },
    overview: { type: String, default: "" },
    titleTag: { type: String, required: true, trim: true },
    metaDescription: { type: String, required: true, trim: true },
    h1Heading: { type: String, required: true, trim: true },
    url: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    sections: { type: [sectionSchema], default: [] },
    content: { type: String, default: "" },
    quickAnswer: { type: String, default: "" },
    metaTag: { type: String, default: "" },
    status: { type: String, enum: PAGE_STATUSES, default: "draft" },
    author: { type: String, default: "SEO Team" },
    targetKeyword: { type: String, default: "", trim: true },
    headingStructure: { type: headingStructureSchema, default: () => ({}) },
    keywordPlacement: { type: [String], default: [] },
    altText: { type: [String], default: [] },
    imageAltText: { type: [String], default: [] },
    internalLinks: { type: [String], default: [] },
    views: { type: Number, default: 0 },
  },
  {
    versionKey: false,
    timestamps: true,
    strict: true,
    autoIndex: false,
  },
);

pageSchema.index({ url: 1 }, { unique: true });
pageSchema.index({ updatedAt: -1 });
pageSchema.index({ pageKind: 1, status: 1, updatedAt: -1 });

type PageSchemaType = InferSchemaType<typeof pageSchema>;
export type PageDocument = HydratedDocument<PageSchemaType>;
type PageModelType = Model<PageSchemaType>;

const Page = (mongoose.models.Page as PageModelType) || mongoose.model<PageSchemaType>("Page", pageSchema, "seo_pages");

export default Page;
