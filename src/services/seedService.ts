import User from "../models/User.js";
import { hashPassword } from "../utils/auth.js";

export async function ensureSuperadmin() {
  const email = String(process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.SUPERADMIN_PASSWORD || "").trim();

  if (!email || !password) return;

  const existing = await User.findOne({ email }).lean();
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await User.create({
    email,
    name: "Superadmin",
    role: "superadmin",
    status: "active",
    passwordHash,
  });
}

export async function ensureDefaultSeoUser() {
  const email = String(process.env.DEFAULT_SEO_EMAIL || "seo@astikan.ai").trim().toLowerCase();
  const password = String(process.env.DEFAULT_SEO_PASSWORD || "Seo12345!").trim();

  if (!email || !password) return;

  const existing = await User.findOne({ email }).lean();
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await User.create({
    email,
    name: "SEO User",
    role: "seo_admin",
    status: "active",
    passwordHash,
  });
}
