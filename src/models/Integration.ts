import mongoose, { Schema } from "mongoose";

export type IntegrationProvider = "gsc" | "gmb";

export type IntegrationConfig = {
  provider: IntegrationProvider;
  siteUrl?: string;
  locationId?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  scopes?: string[];
  status?: "connected" | "disconnected";
  lastSyncAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const IntegrationSchema = new Schema<IntegrationConfig>(
  {
    provider: { type: String, required: true, enum: ["gsc", "gmb"], unique: true },
    siteUrl: { type: String },
    locationId: { type: String },
    clientId: { type: String },
    clientSecret: { type: String },
    redirectUri: { type: String },
    accessToken: { type: String },
    refreshToken: { type: String },
    scopes: { type: [String], default: [] },
    status: { type: String, default: "disconnected" },
    lastSyncAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model<IntegrationConfig>("IntegrationConfig", IntegrationSchema);
