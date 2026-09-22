export const primaryButton =
  "w-full rounded-xl bg-stone-900 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500";
export const textButton =
  "rounded-lg px-1 py-2 text-sm text-amber-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:cursor-not-allowed disabled:text-stone-400";
export const textInput =
  "mt-2 block w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-lg text-stone-900 outline-none transition focus:border-amber-800 focus:ring-2 focus:ring-amber-800/15 disabled:bg-stone-50";

export function AuthError({ message }: Readonly<{ message: string }>) {
  return (
    <p
      id="auth-error"
      role="alert"
      className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
    >
      {message}
    </p>
  );
}

export function LoadingSession() {
  return (
    <p
      role="status"
      className="py-10 text-center text-sm leading-7 text-stone-600"
    >
      در حال بررسی حساب شما…
    </p>
  );
}
