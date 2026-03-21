import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import pageRoutes from "./routes/pageRoutes.js";

dotenv.config();

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL || "";
  return uri.trim().replace(/^['\"]|['\"]$/g, "");
}

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
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

  await app.register(pageRoutes);
  return app;
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

    const app = await buildServer();
    const port = Number(process.env.PORT || 4000);
    await app.listen({ port, host: "0.0.0.0" });

    console.log(`\nServer ready at http://localhost:${port}`);
    console.log(`MongoDB Connected to: ${process.env.MONGODB_DB_NAME || "astikan"}\n`);
  } catch (error) {
    console.error("Startup Error:", error);
    process.exit(1);
  }
}

start();
