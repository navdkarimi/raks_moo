import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="mb-5 text-sm text-stone-500">زیبایی، با انتخاب آگاهانه</p>
        <h1 className="text-4xl font-bold sm:text-5xl">رقص مو</h1>
        <p className="mt-6 leading-8 text-stone-600">
          ما اینجا محصول نمی‌فروشیم، بلکه به دنبال جلوه دادن زیبایی طبیعی و پیدا
          کردن دوستانی برای ادامهٔ زندگی هستیم.
        </p>
        <p className="mt-8 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
          فروشگاه در حال آماده‌سازی است.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-xl bg-stone-900 px-6 py-3 text-sm font-bold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-800"
        >
          ورود یا ساخت حساب
        </Link>
      </section>
    </main>
  );
}
