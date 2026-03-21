import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "../models/User.js";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || "";
  if (!secret) {
    throw new Error("JWT_SECRET missing in backend/.env");
  }
  return secret;
}

export function signToken(payload: { userId: string; role: UserRole }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "8h" });
}

export function verifyToken(token: string): { userId: string; role: UserRole } {
  return jwt.verify(token, getJwtSecret()) as { userId: string; role: UserRole };
}
