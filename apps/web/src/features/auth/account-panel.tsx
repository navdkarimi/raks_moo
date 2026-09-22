"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CurrentUser } from "@raqs/contracts";
import { authClient, AuthClientError, authErrorMessage } from "./auth-client";
import {
  AuthError,
  LoadingSession,
  primaryButton,
  textButton,
} from "./auth-controls";

export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    authClient
      .currentUser(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setUser(result.user);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (reason instanceof AuthClientError && reason.status === 401)
          router.replace("/login");
        else setError(authErrorMessage(reason));
      });
    return () => controller.abort();
  }, [router, retry]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await authClient.logout();
      setUser(null);
      router.replace("/login");
    } catch (reason) {
      setError(authErrorMessage(reason));
      setBusy(false);
    }
  }

  if (!user && !error) return <LoadingSession />;
  return (
    <>
      <h2 className="mb-6 text-xl font-bold">حساب من</h2>
      {error && <AuthError message={error} />}
      {user ? (
        <>
          <p className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900">
            با موفقیت وارد حساب شدید.
          </p>
          <dl className="mb-8">
            <dt className="mb-2 text-sm text-stone-500">
              شمارهٔ موبایل تأییدشده
            </dt>
            <dd className="text-xl font-medium">
              <bdi dir="ltr">{user.mobile.replace(/^\+98/, "0")}</bdi>
            </dd>
          </dl>
          <Link href="/" className={`${primaryButton} block text-center`}>
            بازگشت به خانه
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={busy}
            className={`${textButton} mt-5 w-full`}
          >
            {busy ? "در حال خروج…" : "خروج از حساب"}
          </button>
        </>
      ) : (
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            setError("");
            setRetry((value) => value + 1);
          }}
        >
          تلاش دوباره
        </button>
      )}
    </>
  );
}
