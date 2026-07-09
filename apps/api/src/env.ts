import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3001),
  API_URL: z.string().url().default("http://localhost:3001"),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  // Optional so the API can boot (health + ws) without a database in dev/CI.
  DATABASE_URL: z.string().url().optional(),
  // OAuth: when set, the github provider is used; otherwise the local dev provider.
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

/**
 * Validate env at boot. Bad config crashes HERE with a clear message — not at the first
 * request that happens to need the missing value.
 */
export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
