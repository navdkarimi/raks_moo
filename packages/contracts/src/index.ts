import { z } from "zod";
export * from "./auth.js";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "not_ready"]),
  service: z.literal("raqs-api"),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
