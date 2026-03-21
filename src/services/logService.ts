import Log, { type LogLevel } from "../models/Log.js";

export async function logEvent(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  await Log.create({
    level,
    message,
    meta,
    source: String(meta.source || "backend"),
  });
}

export async function cleanupLogs(retentionDays = 14) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return await Log.deleteMany({
    level: { $in: ["info", "warn"] },
    createdAt: { $lt: cutoff },
  });
}
