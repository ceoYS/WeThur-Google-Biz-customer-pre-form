import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ADMIN_EMAILS: z.string().min(3),
  APP_URL: z.url(),
  TOKEN_HASH_SECRET: z.string().min(32),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  SUBMISSION_NOTIFICATION_EMAIL: z.email().optional().or(z.literal("")),
  EMAIL_FROM: z.string().max(320).optional().or(z.literal("")),
  GOOGLE_SHEETS_WEBHOOK_URL: z.url().optional().or(z.literal("")),
  GOOGLE_SHEETS_WEBHOOK_SECRET: z.string().optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(): ServerEnvironment {
  const parsed = serverEnvironmentSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    APP_URL: process.env.APP_URL,
    TOKEN_HASH_SECRET: process.env.TOKEN_HASH_SECRET,
    EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY,
    SUBMISSION_NOTIFICATION_EMAIL: process.env.SUBMISSION_NOTIFICATION_EMAIL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    GOOGLE_SHEETS_WEBHOOK_URL: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET,
  });

  if (!parsed.success) {
    throw new Error("Required server configuration is unavailable.");
  }

  return parsed.data;
}
