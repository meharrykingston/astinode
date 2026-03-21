export function normalizeSlug(input) {
    if (!input || typeof input !== "string")
        return "/";
    let value = input.trim();
    if (!value)
        return "/";
    if (/^https?:\/\//i.test(value)) {
        try {
            value = new URL(value).pathname || "/";
        }
        catch {
            value = "/";
        }
    }
    value = value.replace(/\\/g, "/").replace(/\s+/g, "-").replace(/\/+/g, "/").toLowerCase();
    if (!value.startsWith("/"))
        value = `/${value}`;
    if (value.length > 1 && value.endsWith("/"))
        value = value.slice(0, -1);
    return value || "/";
}
export function normalizePageKind(value) {
    const allowed = new Set([
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
    const safe = String(value || "").trim().toLowerCase();
    if (safe === "cause")
        return "condition";
    return allowed.has(safe) ? safe : "symptom";
}
export function getPageKindPrefix(pageKind) {
    const kind = normalizePageKind(pageKind);
    if (kind === "symptom")
        return "/symptoms";
    if (kind === "disease")
        return "/diseases";
    if (kind === "medicine")
        return "/medicines";
    if (kind === "condition")
        return "/conditions";
    if (kind === "treatment")
        return "/treatments";
    if (kind === "procedure")
        return "/procedures";
    if (kind === "test")
        return "/tests";
    if (kind === "wellness")
        return "/wellness";
    if (kind === "faq")
        return "/faqs";
    return "/pages";
}
export function ensureKindBasedSlug(inputUrl, pageKind) {
    const normalized = normalizeSlug(inputUrl);
    const prefix = getPageKindPrefix(pageKind);
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length === 0) {
        return prefix;
    }
    if (segments[0] === prefix.slice(1)) {
        return normalized;
    }
    if (segments.length >= 2) {
        return `${prefix}/${segments.slice(1).join("/")}`;
    }
    return `${prefix}/${segments[0]}`;
}
export function parseLines(input) {
    if (Array.isArray(input)) {
        return input.map((item) => String(item || "").trim()).filter(Boolean);
    }
    return String(input || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}
export function normalizeSections(input) {
    if (!Array.isArray(input))
        return [];
    return input
        .map((item, index) => {
        const headingType = item?.headingType === "h3" ? "h3" : "h2";
        return {
            id: String(item?.id || `section-${index + 1}`).trim(),
            heading: String(item?.heading || "").trim(),
            headingType,
            body: String(item?.body || "").trim(),
        };
    })
        .filter((item) => item.heading || item.body);
}
function toIsoString(value) {
    if (!value)
        return new Date(0).toISOString();
    if (value instanceof Date && !Number.isNaN(value.getTime()))
        return value.toISOString();
    if (typeof value === "string") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime()))
            return parsed.toISOString();
    }
    return new Date(0).toISOString();
}
export function mapPage(doc) {
    const rawViews = Number(doc.views);
    const safeViews = Number.isFinite(rawViews) ? rawViews : 0;
    return {
        id: doc._id.toString(),
        pageKind: normalizePageKind(doc.pageKind),
        overview: typeof doc.overview === "string" ? doc.overview : "",
        sections: normalizeSections(doc.sections),
        content: typeof doc.content === "string" ? doc.content : "",
        quickAnswer: typeof doc.quickAnswer === "string" ? doc.quickAnswer : "",
        titleTag: doc.titleTag || "",
        metaTag: doc.metaTag || "",
        metaDescription: doc.metaDescription || "",
        h1Heading: doc.h1Heading || doc.headingStructure?.h1 || doc.titleTag || "",
        url: doc.url || "/",
        status: doc.status === "published" ? "published" : "draft",
        author: doc.author || "SEO Team",
        headingStructure: {
            h1: doc.headingStructure?.h1 || "",
            h2: parseLines(doc.headingStructure?.h2),
            h3: parseLines(doc.headingStructure?.h3),
        },
        keywordPlacement: parseLines(doc.keywordPlacement),
        altText: parseLines(doc.altText),
        imageAltText: parseLines(doc.imageAltText),
        internalLinks: parseLines(doc.internalLinks),
        views: safeViews,
        createdAt: toIsoString(doc.createdAt),
        updatedAt: toIsoString(doc.updatedAt || doc.createdAt),
    };
}
//# sourceMappingURL=helpers.js.map