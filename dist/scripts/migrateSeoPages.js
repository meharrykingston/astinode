import dotenv from "dotenv";
import mongoose from "mongoose";
import Page from "../models/Page.js";
dotenv.config();
const VALID_PAGE_KINDS = new Set([
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
]);
const BATCH_SIZE = 1000;
function getMongoUri() {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URL || "";
    return uri.trim().replace(/^['\"]|['\"]$/g, "");
}
function slugToTitle(input) {
    const clean = String(input || "")
        .replace(/^\/+/, "")
        .split("/")
        .filter(Boolean)
        .pop() || "health-page";
    return clean
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
function stripHtml(input) {
    return String(input || "")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function truncate(input, max) {
    const value = String(input || "").trim();
    if (!value)
        return "";
    if (value.length <= max)
        return value;
    return value.slice(0, max - 1).trimEnd() + "…";
}
function normalizePageKind(value) {
    const safe = String(value || "").trim().toLowerCase();
    if (safe === "cause")
        return "condition";
    return VALID_PAGE_KINDS.has(safe) ? safe : "symptom";
}
function normalizeUrl(input) {
    let value = String(input || "").trim().toLowerCase();
    if (!value)
        return "/";
    if (!value.startsWith("/"))
        value = `/${value}`;
    value = value.replace(/\/+/g, "/");
    if (value.length > 1 && value.endsWith("/"))
        value = value.slice(0, -1);
    return value;
}
function normalizeSections(input) {
    if (!Array.isArray(input))
        return [];
    return input.map((section, index) => ({
        id: String(section?.id || `section-${index + 1}`).trim(),
        heading: String(section?.heading || "").trim(),
        headingType: section?.headingType === "h3" ? "h3" : "h2",
        body: String(section?.body || "").trim(),
    }));
}
function toDateOrUndefined(input) {
    if (!input)
        return undefined;
    if (input instanceof Date && !Number.isNaN(input.getTime()))
        return input;
    const parsed = new Date(String(input));
    if (!Number.isNaN(parsed.getTime()))
        return parsed;
    return undefined;
}
async function run() {
    const shouldCommit = process.argv.includes("--commit");
    const mongoUri = getMongoUri();
    if (!mongoUri)
        throw new Error("MONGODB_URI missing in .env");
    await mongoose.connect(mongoUri, {
        tlsAllowInvalidCertificates: process.env.MONGODB_TLS_ALLOW_INVALID_CERTS === "true",
        connectTimeoutMS: 10000,
        dbName: process.env.MONGODB_DB_NAME || "astikan",
    });
    const cursor = Page.find({}).lean().cursor();
    let scanned = 0;
    let toUpdate = 0;
    let batches = 0;
    let batchOps = [];
    for await (const doc of cursor) {
        scanned += 1;
        const url = normalizeUrl(doc.url);
        const pageKind = normalizePageKind(doc.pageKind);
        const sections = normalizeSections(doc.sections);
        const fallbackTitle = slugToTitle(url);
        const h1Heading = truncate(String(doc.h1Heading || doc.headingStructure?.h1 || sections[0]?.heading || doc.titleTag || fallbackTitle), 120);
        const titleTag = truncate(String(doc.titleTag || h1Heading || fallbackTitle), 70);
        const descriptionSource = doc.metaDescription || doc.overview || doc.quickAnswer || sections.map((section) => section.body).join(" ");
        const metaDescription = truncate(stripHtml(String(descriptionSource || "")), 160);
        const altText = Array.isArray(doc.altText)
            ? doc.altText.map((item) => String(item || "").trim()).filter(Boolean)
            : Array.isArray(doc.imageAltText)
                ? doc.imageAltText.map((item) => String(item || "").trim()).filter(Boolean)
                : [];
        const createdAt = toDateOrUndefined(doc.createdAt);
        const updatedAt = toDateOrUndefined(doc.updatedAt) || createdAt;
        const patch = {
            pageKind,
            url,
            titleTag,
            metaDescription,
            h1Heading,
            sections,
            altText,
            imageAltText: Array.isArray(doc.imageAltText) ? doc.imageAltText : altText,
        };
        if (createdAt)
            patch.createdAt = createdAt;
        if (updatedAt)
            patch.updatedAt = updatedAt;
        batchOps.push({
            updateOne: {
                filter: { _id: doc._id },
                update: { $set: patch },
            },
        });
        toUpdate += 1;
        if (batchOps.length >= BATCH_SIZE) {
            batches += 1;
            if (shouldCommit) {
                await Page.bulkWrite(batchOps, { ordered: false });
            }
            batchOps = [];
            if (batches % 10 === 0) {
                console.log(`[migrate-seo-pages] batches=${batches} scanned=${scanned} updated=${toUpdate}`);
            }
        }
    }
    if (batchOps.length > 0) {
        batches += 1;
        if (shouldCommit) {
            await Page.bulkWrite(batchOps, { ordered: false });
        }
    }
    console.log(`[migrate-seo-pages] done scanned=${scanned} prepared_updates=${toUpdate} batches=${batches} commit=${shouldCommit}`);
    await mongoose.disconnect();
}
run().catch(async (error) => {
    console.error("[migrate-seo-pages] failed", error);
    await mongoose.disconnect();
    process.exit(1);
});
//# sourceMappingURL=migrateSeoPages.js.map