import type { IntegrationConfig } from "../models/Integration.js";

export type TopQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscQueryParams = {
  startDate?: string;
  endDate?: string;
  limit?: number;
};

export async function fetchTopQueries(
  config: IntegrationConfig,
  params: GscQueryParams,
): Promise<TopQueryRow[]> {
  if (!config.siteUrl) {
    throw new Error("GSC siteUrl not configured");
  }

  // Placeholder implementation.
  // Wire googleapis Search Console here when credentials are provided.
  const limit = Math.min(params.limit ?? 10, 50);
  return Array.from({ length: limit }).map((_, idx) => ({
    query: `sample query ${idx + 1}`,
    clicks: 120 - idx * 3,
    impressions: 3200 - idx * 40,
    ctr: 0.08,
    position: 3.2 + idx * 0.1,
  }));
}

export async function submitSitemap(config: IntegrationConfig, sitemapUrl: string): Promise<void> {
  if (!config.siteUrl) {
    throw new Error("GSC siteUrl not configured");
  }

  if (!sitemapUrl) {
    throw new Error("sitemapUrl is required");
  }

  // Placeholder implementation. Use Google Search Console API here.
  return;
}
