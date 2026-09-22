"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { mobileSchema, verifyOtpSchema } from "@raqs/contracts";
import { authClient, AuthClientError, authErrorMessage } from "./auth-client";
import {
  AuthError,
  LoadingSession,
  primaryButton,
  textButton,
  textInput,
} from "./auth-controls";

type Challenge = {
  id: string;
  mobile: string;
  expiresAt: number;
  resendAt: number;
};

export function LoginForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);
  const mobileInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    authClient
      .currentUser(controller.signal)
      .then(() => router.replace("/account"))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (!(reason instanceof AuthClientError && reason.status === 401))
          setError(authErrorMessage(reason));
        setChecking(false);
      });
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (checking) return;
    (challenge ? codeInput.current : mobileInput.current)?.focus();
  }, [checking, challenge]);

  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  const resendSeconds = challenge
    ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000))
    : 0;
  const expired = challenge !== null && now >= challenge.expiresAt;

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function requestCode(normalizedMobile: string) {
    const response = await authClient.requestCode(normalizedMobile);
    const receivedAt = Date.now();
    setNow(receivedAt);
    setCode("");
    setChallenge({
      id: response.challengeId,
      mobile: normalizedMobile,
      expiresAt: receivedAt + response.expiresInSeconds * 1000,
      resendAt: receivedAt + response.retryAfterSeconds * 1000,
    });
    setNotice("کد ورود ارسال شد.");
  }

  function submitMobile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = mobileSchema.safeParse(mobile);
    if (!parsed.success) {
      setError("شمارهٔ موبایل معتبر وارد کنید؛ مانند ۰۹۱۲۳۴۵۶۷۸۹.");
      mobileInput.current?.focus();
      return;
    }
    void run(() => requestCode(parsed.data));
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || expired) return;
    const parsed = verifyOtpSchema.safeParse({
      mobile: challenge.mobile,
      challengeId: challenge.id,
      code,
    });
    if (!parsed.success) {
      setError("کد شش‌رقمی پیامک را وارد کنید.");
      codeInput.current?.focus();
      return;
    }
    void run(async () => {
      await authClient.verifyCode(parsed.data);
      setCode("");
      router.replace("/account");
    });
  }

  if (checking) return <LoadingSession />;
  return (
    <>
      <h2 className="mb-2 text-xl font-bold">
        {challenge ? "کد ورود را وارد کنید" : "ورود یا ساخت حساب"}
      </h2>
      <p className="mb-7 text-sm leading-7 text-stone-500">
        {challenge ? (
          <>
            کد به شمارهٔ{" "}
            <bdi dir="ltr">{challenge.mobile.replace(/^\+98/, "0")}</bdi> ارسال
            شد.
          </>
        ) : (
          "شمارهٔ موبایل خود را وارد کنید."
        )}
      </p>
      {error && <AuthError message={error} />}
      {notice && (
        <p role="status" className="mb-4 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {challenge ? (
        <form onSubmit={submitCode} noValidate aria-busy={busy}>
          <label htmlFor="otp" className="text-sm font-medium">
            کد شش‌رقمی
          </label>
          <input
            ref={codeInput}
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={busy || expired}
            aria-describedby={error ? "auth-error" : "otp-help"}
            className={`${textInput} text-center tracking-[0.4em]`}
          />
          <p
            id="otp-help"
            className="mb-6 mt-3 text-xs leading-6 text-stone-500"
          >
            {expired
              ? "اعتبار کد تمام شده است. یک کد جدید درخواست کنید."
              : "ارقام فارسی و انگلیسی پذیرفته می‌شوند."}
          </p>
          <button
            type="submit"
            className={primaryButton}
            disabled={busy || expired}
          >
            {busy ? "در حال انجام…" : "تأیید و ورود"}
          </button>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className={textButton}
              disabled={busy || resendSeconds > 0}
              onClick={() => void run(() => requestCode(challenge.mobile))}
            >
              {resendSeconds > 0
                ? `ارسال مجدد تا ${resendSeconds.toLocaleString("fa-IR")} ثانیه`
                : "ارسال مجدد کد"}
            </button>
            <button
              type="button"
              className={textButton}
              disabled={busy}
              onClick={() => {
                setChallenge(null);
                setCode("");
                setError("");
                setNotice("");
              }}
            >
              ویرایش شماره
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={submitMobile} noValidate aria-busy={busy}>
          <label htmlFor="mobile" className="text-sm font-medium">
            شمارهٔ موبایل
          </label>
          <input
            ref={mobileInput}
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            maxLength={32}
            placeholder="0912 345 6789"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            disabled={busy}
            aria-describedby={error ? "auth-error" : "mobile-help"}
            className={textInput}
          />
          <p
            id="mobile-help"
            className="mb-6 mt-3 text-xs leading-6 text-stone-500"
          >
            کد تأیید به همین شماره پیامک می‌شود.
          </p>
          <button type="submit" className={primaryButton} disabled={busy}>
            {busy ? "در حال ارسال…" : "دریافت کد ورود"}
          </button>
        </form>
      )}
    </>
  );
}
