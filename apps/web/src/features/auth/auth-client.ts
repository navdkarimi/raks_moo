import {
  apiErrorSchema,
  otpRequestedSchema,
  sessionResponseSchema,
} from "@raqs/contracts";

export class AuthClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function send(path: string, body?: unknown, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15_000);
  let response: Response;
  try {
    response = await fetch(`/api/v1/auth${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AuthClientError(
      "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
      "NETWORK_ERROR",
      0,
    );
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const parsed = apiErrorSchema.safeParse(data);
    throw new AuthClientError(
      parsed.success
        ? parsed.data.error.message
        : "سرویس موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.",
      parsed.success ? parsed.data.error.code : "SERVICE_UNAVAILABLE",
      response.status,
    );
  }
  return response;
}

async function readJson<T>(
  response: Response,
  schema: { parse: (input: unknown) => T },
): Promise<T> {
  try {
    return schema.parse(await response.json());
  } catch {
    throw new AuthClientError(
      "پاسخ سرویس معتبر نیست. دوباره تلاش کنید.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
}

export const authClient = {
  async requestCode(mobile: string) {
    return readJson(await send("/otp/request", { mobile }), otpRequestedSchema);
  },
  async verifyCode(input: {
    mobile: string;
    challengeId: string;
    code: string;
  }) {
    return readJson(await send("/otp/verify", input), sessionResponseSchema);
  },
  async currentUser(signal?: AbortSignal) {
    return readJson(
      await send("/me", undefined, signal),
      sessionResponseSchema,
    );
  },
  async logout() {
    await send("/logout", {});
  },
};

export function authErrorMessage(error: unknown): string {
  return error instanceof AuthClientError
    ? error.message
    : "خطایی رخ داد. دوباره تلاش کنید.";
}
