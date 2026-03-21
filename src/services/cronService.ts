import cron from "node-cron";
import { logEvent, cleanupLogs } from "./logService.js";

async function runSitemapGeneration() {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${siteUrl}/sitemap.xml`, { method: "GET" });
    if (!response.ok) {
      await logEvent("warn", "Sitemap generation returned non-200", {
        source: "backend",
        status: response.status,
        siteUrl,
      });
      return;
    }
    await logEvent("info", "Sitemap generation completed", {
      source: "backend",
      siteUrl,
    });
  } catch (error) {
    await logEvent("error", "Sitemap generation failed", {
      source: "backend",
      siteUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function runLogCleanup() {
  try {
    const result = await cleanupLogs(14);
    await logEvent("info", "Log cleanup completed", {
      source: "backend",
      deletedCount: result.deletedCount ?? 0,
    });
  } catch (error) {
    await logEvent("error", "Log cleanup failed", {
      source: "backend",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function startCronJobs() {
  cron.schedule("0 2 * * *", () => {
    void runSitemapGeneration();
  });

  cron.schedule("30 2 * * *", () => {
    void runLogCleanup();
  });
}

export async function runJobNow(job: "sitemap" | "cleanup") {
  if (job === "sitemap") return await runSitemapGeneration();
  return await runLogCleanup();
}
