import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { CurrentUser } from "@raqs/contracts";
import { HttpError } from "../../http/http-error.js";
import type { AuthPolicy } from "./auth.policy.js";
import type { AuthRepository } from "./auth.repository.js";
import type { SmsSender } from "./sms-sender.js";

const invalidCode = () =>
  new HttpError(
    400,
    "INVALID_OTP",
    "کد نامعتبر یا منقضی شده است. دوباره درخواست کد بدهید.",
  );
const unauthorized = () =>
  new HttpError(401, "UNAUTHENTICATED", "برای ادامه وارد حساب خود شوید.");
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly sms: SmsSender,
    private readonly secret: string,
    readonly policy: Readonly<AuthPolicy>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private digest(value: string) {
    return createHmac("sha256", this.secret).update(value).digest("hex");
  }

  private async quota(
    scope: string,
    identity: string,
    limit: number,
    now: Date,
  ) {
    const bucket = Math.floor(now.getTime() / 3_600_000);
    const key = `${scope}:${this.digest(identity)}:${bucket}`;
    const allowed = await this.repository.consumeQuota(
      key,
      limit,
      new Date((bucket + 2) * 3_600_000),
    );
    if (!allowed)
      throw new HttpError(
        429,
        "TOO_MANY_REQUESTS",
        "تعداد تلاش‌ها بیش از حد مجاز است. بعداً دوباره امتحان کنید.",
      );
  }

  async requestCode(mobile: string, ip: string) {
    if (!this.sms.available)
      throw new HttpError(
        503,
        "SMS_UNAVAILABLE",
        "ارسال پیامک فعلاً در دسترس نیست.",
      );
    const now = this.now();
    await this.quota("send-ip", ip, this.policy.sendsPerIpPerHour, now);
    await this.quota(
      "send-mobile",
      mobile,
      this.policy.sendsPerMobilePerHour,
      now,
    );
    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const reserved = await this.repository.reserveChallenge({
      mobile,
      challengeId,
      now,
      codeHash: this.digest(`${challengeId}:${code}`),
      expiresAt: new Date(
        now.getTime() + this.policy.otpLifetimeSeconds * 1000,
      ),
      nextSendAt: new Date(
        now.getTime() + this.policy.resendDelaySeconds * 1000,
      ),
    });
    if (!reserved)
      throw new HttpError(
        429,
        "RESEND_TOO_SOON",
        "برای ارسال دوبارهٔ کد کمی صبر کنید.",
      );
    try {
      await this.sms.sendOtp({
        mobile,
        code,
        expiresInSeconds: this.policy.otpLifetimeSeconds,
      });
    } catch {
      await this.repository.finishDelivery(mobile, challengeId, "failed");
      throw new HttpError(
        503,
        "SMS_UNAVAILABLE",
        "ارسال پیامک انجام نشد. کمی بعد دوباره تلاش کنید.",
      );
    }
    const delivery = await this.repository.finishDelivery(
      mobile,
      challengeId,
      "ready",
    );
    if (delivery.modifiedCount !== 1)
      throw new HttpError(
        503,
        "SMS_UNAVAILABLE",
        "درخواست کد تغییر کرده است. دوباره تلاش کنید.",
      );
    return {
      challengeId,
      expiresInSeconds: this.policy.otpLifetimeSeconds,
      retryAfterSeconds: this.policy.resendDelaySeconds,
    };
  }

  async verifyCode(
    input: { mobile: string; challengeId: string; code: string },
    ip: string,
  ) {
    const now = this.now();
    await this.quota(
      "verify-ip",
      ip,
      this.policy.verificationsPerIpPerHour,
      now,
    );
    const challenge = await this.repository.takeAttempt(
      input.mobile,
      input.challengeId,
      now,
      this.policy.maxAttempts,
    );
    if (!challenge) throw invalidCode();
    const expected = Buffer.from(challenge.codeHash, "hex");
    const actual = Buffer.from(
      this.digest(`${input.challengeId}:${input.code}`),
      "hex",
    );
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw invalidCode();
    if (
      !(await this.repository.consumeChallenge(
        input.mobile,
        input.challengeId,
        this.now(),
      ))
    )
      throw invalidCode();
    const user = await this.repository.getOrCreateUser(input.mobile, now);
    if (!user || user.status !== "active")
      throw new HttpError(
        403,
        "ACCOUNT_UNAVAILABLE",
        "این حساب امکان ورود ندارد.",
      );
    const token = randomBytes(32).toString("hex");
    await this.repository.createSession(
      tokenHash(token),
      user._id,
      new Date(now.getTime() + this.policy.sessionLifetimeSeconds * 1000),
    );
    return {
      token,
      user: { id: user._id, mobile: user.mobile } satisfies CurrentUser,
    };
  }

  async currentUser(token: string | undefined): Promise<CurrentUser> {
    if (!token) throw unauthorized();
    const session = await this.repository.findSession(
      tokenHash(token),
      this.now(),
    );
    if (!session) throw unauthorized();
    const user = await this.repository.findUser(session.userId);
    if (!user || user.status !== "active") throw unauthorized();
    return { id: user._id, mobile: user.mobile };
  }

  async logout(token: string | undefined) {
    if (token) await this.repository.revokeSession(tokenHash(token));
  }
}
