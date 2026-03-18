import { z } from "zod";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),

  // Email — Resend
  RESEND_API: z.string().min(1, "RESEND_API is required"),
  EMAIL_FROM: z.string().default("noreply@commit.app"),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // Groq AI
  GROQ_API: z.string().min(1, "GROQ_API is required"),

  // Expo push notifications
  EXPO_ACCESS_TOKEN: z.string().optional().default(""),

  // Admin
  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS is required"),
  ADMIN_INVITE_CODE: z.string().default("COMMIT-ADMIN"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error("[ENV]: Missing or invalid environment variables:");
  logger.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

logger.info("[ENV]: All required env vars present");

export default parsed.data;
