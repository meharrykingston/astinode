import mongoose, { Schema } from "mongoose";
const PAGE_KINDS = [
    "symptom",
    "disease",
    "medicine",
    "condition",
    "treatment",
    "procedure",
    "test",
    "wellness",
    "faq",
    "other",
];
const sectionSchema = new Schema({
    id: { type: String, required: true, trim: true },
    heading: { type: String, required: true, trim: true },
    headingType: { type: String, enum: ["h2", "h3"], required: true },
    body: { type: String, required: true, default: "" }, // HTML string
}, { _id: false });
const headingStructureSchema = new Schema({
    h1: { type: String, default: "" },
    h2: { type: [String], default: [] },
    h3: { type: [String], default: [] },
}, { _id: false });
const pageSchema = new Schema({
    pageKind: { type: String, enum: PAGE_KINDS, default: "symptom", index: true },
    overview: { type: String, default: "" },
    titleTag: { type: String, required: true, trim: true, maxlength: 70 },
    metaDescription: { type: String, required: true, trim: true, maxlength: 160 },
    h1Heading: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    sections: { type: [sectionSchema], default: [] },
    content: { type: String, default: "" },
    quickAnswer: { type: String, default: "" },
    metaTag: { type: String, default: "" },
    status: { type: String, default: "draft" },
    author: { type: String, default: "SEO Team" },
    headingStructure: { type: headingStructureSchema, default: () => ({}) },
    keywordPlacement: { type: [String], default: [] },
    altText: { type: [String], default: [] },
    imageAltText: { type: [String], default: [] },
    internalLinks: { type: [String], default: [] },
    views: { type: Number, default: 0 },
}, {
    versionKey: false,
    timestamps: true,
    strict: true,
    autoIndex: false,
});
pageSchema.index({ url: 1 }, { unique: true });
pageSchema.index({ updatedAt: -1 });
pageSchema.index({ pageKind: 1, status: 1, updatedAt: -1 });
const Page = mongoose.models.Page || mongoose.model("Page", pageSchema, "seo_pages");
export default Page;
//# sourceMappingURL=Page.js.map