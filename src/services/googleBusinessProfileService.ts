import type { IntegrationConfig } from "../models/Integration.js";

export type GmbLocation = {
  locationId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
};

export async function fetchLocations(config: IntegrationConfig): Promise<GmbLocation[]> {
  if (!config.locationId && !config.accessToken && !config.refreshToken) {
    throw new Error("GMB integration not configured");
  }

  // Placeholder implementation. Wire Google Business Profile API here.
  return [
    {
      locationId: config.locationId || "locations/123456",
      name: "Astikan Healthcare",
      address: "123 Wellness Avenue, Bengaluru",
      phone: "+91 98765 43210",
      website: "https://example.com",
    },
  ];
}
