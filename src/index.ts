import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import net from "node:net";
import pageRoutes from "./routes/pageRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import diagnoseRoutes from "./routes/diagnoseRoutes.js";
import { startCronJobs } from "./services/cronService.js";
import { ensureDefaultSeoUser, ensureSuperadmin } from "./services/seedService.js";

dotenv.config();

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL || "";
  return uri.trim().replace(/^['\"]|['\"]$/g, "");
}

async function buildServer() {
  const app = Fastify({ logger: true });

  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.SITE_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.get("/status", async () => {
    return {
      status: "online",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      service: "astikan-backend",
    };
  });

  app.get("/", async () => {
    return {
      status: "online",
      service: "astikan-backend",
      hint: "Use /status or /api/* routes",
    };
  });

  await app.register(pageRoutes);
  await app.register(authRoutes);
  await app.register(adminRoutes);
  await app.register(logRoutes);
  await app.register(integrationRoutes);
  await app.register(blogRoutes, { prefix: "/api/blogs" });
  await app.register(diagnoseRoutes);
  return app;
}

async function isPortFree(port: number, host: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort: number, host: string, maxAttempts = 20): Promise<number> {
  let port = startPort;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await isPortFree(port, host)) return port;
    port += 1;
  }
  throw new Error(`No available port found from ${startPort} to ${port - 1}`);
}

async function start() {
  try {
    const mongoUri = getMongoUri();
    if (!mongoUri) throw new Error("MONGODB_URI missing in backend/.env");

    await mongoose.connect(mongoUri, {
      tlsAllowInvalidCertificates: process.env.MONGODB_TLS_ALLOW_INVALID_CERTS === "true",
      connectTimeoutMS: 10000,
      dbName: process.env.MONGODB_DB_NAME || "astikan",
    });

    await ensureSuperadmin();
    await ensureDefaultSeoUser();

    const app = await buildServer();
    const host = "0.0.0.0";
    const desiredPort = Number(process.env.PORT || 4000);
    const port = await findAvailablePort(desiredPort, host);
    await app.listen({ port, host });

    startCronJobs();

    console.log(`\nServer ready at http://localhost:${port}`);
    console.log(`MongoDB Connected to: ${process.env.MONGODB_DB_NAME || "astikan"}\n`);
  } catch (error) {
    console.error("Startup Error:", error);
    process.exit(1);
  }
}

start();
