import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = Fastify({ 
  logger: true // Har request terminal mein dikhegi
});

// CORS: Next.js frontend se request allow karne ke liye
await app.register(cors, { origin: "*" });

// MongoDB Connection Logic
const start = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ ERROR: MONGO_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(uri);
    app.log.info("✅ MongoDB Connected Successfully!");

    // Railway aur local dono ke liye port setup
    const port = Number(process.env.PORT) || 8080;
    await app.listen({ port, host: '0.0.0.0' });

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Ek test route taaki browser mein check kar sako
app.get('/check', async () => {
  return { status: "OK", message: "Astikan Backend is Running!" };
});

start();