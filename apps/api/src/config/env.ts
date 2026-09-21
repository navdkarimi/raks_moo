import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
});

export function readEnv(input: NodeJS.ProcessEnv = process.env) {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    // Never include environment values: the MongoDB URI can contain credentials.
    const fields = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`Invalid or missing environment variables: ${fields.join(", ")}`);
  }
  return result.data;
}
