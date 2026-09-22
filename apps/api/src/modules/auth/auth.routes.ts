import { Router } from "express";
import { requestOtpSchema, verifyOtpSchema } from "@raqs/contracts";
import { HttpError } from "../../http/http-error.js";
import type { AuthService } from "./auth.service.js";

export function createAuthRouter(
  service: AuthService,
  options: { origin: string; production: boolean },
) {
  const router = Router();
  const cookieName = options.production
    ? "__Host-raqs_session"
    : "raqs_session";
  const cookieOptions = {
    httpOnly: true,
    secure: options.production,
    sameSite: "lax" as const,
    path: "/",
  };
  const readToken = (header: string | undefined) => {
    const match = header?.match(
      new RegExp(`(?:^|;\\s*)${cookieName}=([a-f0-9]{64})(?:;|$)`),
    );
    return match?.[1];
  };
  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      req.get("origin") !== options.origin
    ) {
      throw new HttpError(403, "ORIGIN_NOT_ALLOWED", "مبدأ درخواست مجاز نیست.");
    }
    next();
  });
  router.post("/otp/request", async (req, res) => {
    const parsed = requestOtpSchema.safeParse(req.body);
    if (!parsed.success)
      throw new HttpError(
        400,
        "INVALID_INPUT",
        "شمارهٔ موبایل معتبر وارد کنید.",
      );
    const challenge = await service.requestCode(
      parsed.data.mobile,
      req.ip ?? "unknown",
    );
    res.status(202).json(challenge);
  });
  router.post("/otp/verify", async (req, res) => {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success)
      throw new HttpError(400, "INVALID_INPUT", "اطلاعات کد ورود معتبر نیست.");
    const result = await service.verifyCode(parsed.data, req.ip ?? "unknown");
    await service.logout(readToken(req.get("cookie")));
    res.cookie(cookieName, result.token, {
      ...cookieOptions,
      maxAge: service.policy.sessionLifetimeSeconds * 1000,
    });
    res.json({ user: result.user });
  });
  router.get("/me", async (req, res) => {
    res.json({ user: await service.currentUser(readToken(req.get("cookie"))) });
  });
  router.post("/logout", async (req, res) => {
    await service.logout(readToken(req.get("cookie")));
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  });
  return router;
}
