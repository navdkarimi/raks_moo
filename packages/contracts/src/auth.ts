import { z } from "zod";

function latinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) =>
    String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
  );
}

export const mobileSchema = z
  .string()
  .max(32)
  .transform((value) => {
    const digits = latinDigits(value)
      .trim()
      .replace(/[\s()-]/g, "");
    if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`;
    if (/^00989\d{9}$/.test(digits)) return `+${digits.slice(2)}`;
    return digits;
  })
  .pipe(z.string().regex(/^\+989\d{9}$/, "شمارهٔ موبایل ایران معتبر نیست."));

export const requestOtpSchema = z.object({ mobile: mobileSchema }).strict();
export const verifyOtpSchema = z
  .object({
    mobile: mobileSchema,
    challengeId: z.uuid(),
    code: z
      .string()
      .max(6)
      .transform(latinDigits)
      .pipe(z.string().regex(/^\d{6}$/)),
  })
  .strict();

export const otpRequestedSchema = z.object({
  challengeId: z.uuid(),
  expiresInSeconds: z.number().int().positive(),
  retryAfterSeconds: z.number().int().positive(),
});
export const currentUserSchema = z.object({
  id: z.uuid(),
  mobile: mobileSchema,
});
export const sessionResponseSchema = z.object({ user: currentUserSchema });
export type CurrentUser = z.infer<typeof currentUserSchema>;
