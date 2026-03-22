import type { FastifyInstance } from "fastify";
import { requireSuperadmin } from "../utils/authMiddleware.js";
import {
  getIntegration,
  isConfigured,
  maskSecrets,
  saveIntegration,
} from "../services/integrationService.js";
import { fetchTopQueries, submitSitemap } from "../services/googleSearchConsoleService.js";
import { fetchLocations } from "../services/googleBusinessProfileService.js";

export default async function integrationRoutes(app: FastifyInstance) {
  app.get("/api/integrations/gsc/status", async (request) => {
    requireSuperadmin(request);
    const config = await getIntegration("gsc");
    return {
      provider: "gsc",
      configured: isConfigured(config),
      config: maskSecrets(config),
    };
  });

  app.get("/api/integrations/gsc/config", async (request) => {
    requireSuperadmin(request);
    const config = await getIntegration("gsc");
    return { provider: "gsc", config: maskSecrets(config) };
  });

  app.post("/api/integrations/gsc/config", async (request) => {
    requireSuperadmin(request);
    const payload = request.body as Record<string, unknown>;
    const config = await saveIntegration("gsc", {
      siteUrl: String(payload.siteUrl || ""),
      clientId: payload.clientId ? String(payload.clientId) : undefined,
      clientSecret: payload.clientSecret ? String(payload.clientSecret) : undefined,
      redirectUri: payload.redirectUri ? String(payload.redirectUri) : undefined,
      accessToken: payload.accessToken ? String(payload.accessToken) : undefined,
      refreshToken: payload.refreshToken ? String(payload.refreshToken) : undefined,
      scopes: Array.isArray(payload.scopes) ? payload.scopes.map(String) : undefined,
      status: payload.status === "connected" ? "connected" : "disconnected",
    });
    return { provider: "gsc", config: maskSecrets(config) };
  });

  app.get("/api/integrations/gsc/top-queries", async (request) => {
    requireSuperadmin(request);
    const config = await getIntegration("gsc");
    if (!isConfigured(config)) {
      return { configured: false, data: [], message: "GSC not configured" };
    }

    const query = request.query as Record<string, string>;
    const data = await fetchTopQueries(config!, {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit ? Number(query.limit) : undefined,
    });

    return { configured: true, data };
  });

  app.post("/api/integrations/gsc/submit-sitemap", async (request) => {
    requireSuperadmin(request);
    const config = await getIntegration("gsc");
    if (!isConfigured(config)) {
      return { configured: false, message: "GSC not configured" };
    }

    const body = request.body as { sitemapUrl?: string };
    await submitSitemap(config!, String(body.sitemapUrl || ""));
    return { configured: true, message: "Sitemap submission queued" };
  });

  app.get("/api/integrations/gmb/status", async (request) => {
    requireSuperadmin(request);
    const config = await getIntegration("gmb");
    return {
      provider: "gmb",
      configured: isConfigured(config),
      config: maskSecrets(config),
    };
  });

  app.get("/api/integrations/gmb/config", async (request) => {
    requireSuperadmin(request);
    const config = await getIntegration("gmb");
    return { provider: "gmb", config: maskSecrets(config) };
  });

  app.post("/api/integrations/gmb/config", async (request) => {
    requireSuperadmin(request);
    const payload = request.body as Record<string, unknown>;
    const config = await saveIntegration("gmb", {
      locationId: payload.locationId ? String(payload.locationId) : undefined,
      clientId: payload.clientId ? String(payload.clientId) : undefined,
      clientSecret: payload.clientSecret ? String(payload.clientSecret) : undefined,
      redirectUri: payload.redirectUri ? String(payload.redirectUri) : undefined,
      accessToken: payload.accessToken ? String(payload.accessToken) : undefined,
      refreshToken: payload.refreshToken ? String(payload.refreshToken) : undefined,
      scopes: Array.isArray(payload.scopes) ? payload.scopes.map(String) : undefined,
      status: payload.status === "connected" ? "connected" : "disconnected",
    });
    return { provider: "gmb", config: maskSecrets(config) };
  });

  app.get("/api/integrations/gmb/locations", async (request) => {
    requireSuperadmin(request);
    const config = await getIntegration("gmb");
    if (!isConfigured(config)) {
      return { configured: false, data: [], message: "GMB not configured" };
    }

    const data = await fetchLocations(config!);
    return { configured: true, data };
  });
}
