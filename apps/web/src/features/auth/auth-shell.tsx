import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-7 sm:px-10">
      <nav
        aria-label="ناوبری حساب"
        className="flex items-center justify-between gap-4"
      >
        <Link
          href="/"
          className="rounded-lg text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-800"
        >
          رقص مو
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-700" />
        </Link>
        <Link
          href="/"
          className="rounded-lg text-sm text-stone-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-800"
        >
          بازگشت به خانه
        </Link>
      </nav>
      <div className="grid flex-1 items-center gap-12 py-12 md:grid-cols-2 md:gap-20">
        <section className="max-w-lg">
          <p className="mb-5 text-sm text-amber-800">
            زیبایی، با انتخاب آگاهانه
          </p>
          <h1 className="text-3xl font-bold leading-relaxed sm:text-4xl">
            شروع یک همراهی زیبا
          </h1>
          <p className="mt-5 max-w-md text-sm leading-8 text-stone-600 sm:text-base">
            برای ورود یا ساخت حساب، تنها به شمارهٔ موبایل خود نیاز دارید. کد
            ورود برای همان شماره ارسال می‌شود.
          </p>
          <div
            aria-hidden="true"
            className="mt-8 hidden h-px w-24 bg-amber-800/35 md:block"
          />
        </section>
        <section
          aria-label="حساب کاربری"
          className="w-full rounded-3xl border border-stone-200/90 bg-white p-6 shadow-[0_12px_60px_-30px_rgba(80,60,30,0.25)] sm:p-10"
        >
          {children}
        </section>
      </div>
      <p className="pb-2 text-center text-xs leading-6 text-stone-500">
        کد ورود شخصی است؛ آن را در اختیار دیگران قرار ندهید.
      </p>
    </main>
  );
}
