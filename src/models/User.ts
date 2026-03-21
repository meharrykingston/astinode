import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from "mongoose";

export const USER_ROLES = ["superadmin", "seo_admin", "seo_editor", "seo_viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, default: "", trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "seo_viewer" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, strict: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });

type UserSchemaType = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserSchemaType>;
type UserModelType = Model<UserSchemaType>;

const User = (mongoose.models.User as UserModelType) || mongoose.model<UserSchemaType>("User", userSchema, "users");

export default User;
