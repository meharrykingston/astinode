import IntegrationConfigModel, { type IntegrationProvider, type IntegrationConfig } from "../models/Integration.js";

const SECRET_FIELDS = new Set(["clientSecret", "accessToken", "refreshToken"]);

export type IntegrationPayload = {
  siteUrl?: string;
  locationId?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  scopes?: string[];
  status?: "connected" | "disconnected";
};

export async function getIntegration(provider: IntegrationProvider): Promise<IntegrationConfig | null> {
  return IntegrationConfigModel.findOne({ provider }).lean();
}

export async function saveIntegration(
  provider: IntegrationProvider,
  payload: IntegrationPayload,
): Promise<IntegrationConfig> {
  const update: IntegrationPayload = {
    ...payload,
  };
  if (payload.accessToken || payload.refreshToken) {
    update.status = "connected";
  }

  const doc = await IntegrationConfigModel.findOneAndUpdate(
    { provider },
    { $set: { provider, ...update } },
    { upsert: true, new: true },
  ).lean();

  return doc as IntegrationConfig;
}

export function maskSecrets(config: IntegrationConfig | null): IntegrationConfig | null {
  if (!config) return null;
  const masked = { ...config };
  SECRET_FIELDS.forEach((key) => {
    if ((masked as Record<string, string | undefined>)[key]) {
      (masked as Record<string, string | undefined>)[key] = "********";
    }
  });
  return masked;
}

export function isConfigured(config: IntegrationConfig | null): boolean {
  if (!config) return false;
  if (config.provider === "gsc") {
    return Boolean(config.siteUrl && (config.refreshToken || config.accessToken));
  }
  if (config.provider === "gmb") {
    return Boolean(config.locationId && (config.refreshToken || config.accessToken));
  }
  return false;
}
