import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from "mongoose";

export const LOG_LEVELS = ["info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const logSchema = new Schema(
  {
    level: { type: String, enum: LOG_LEVELS, required: true },
    source: { type: String, default: "backend", trim: true },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false, strict: true },
);

logSchema.index({ level: 1, createdAt: -1 });
logSchema.index({ source: 1, createdAt: -1 });

type LogSchemaType = InferSchemaType<typeof logSchema>;
export type LogDocument = HydratedDocument<LogSchemaType>;
type LogModelType = Model<LogSchemaType>;

const Log = (mongoose.models.Log as LogModelType) || mongoose.model<LogSchemaType>("Log", logSchema, "logs");

export default Log;
