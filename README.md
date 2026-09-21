# رقص مو

اسکلت اولیهٔ فروشگاه چندتأمین‌کننده‌ای با مدیریت مرکزی. این مرحله فقط زیرساخت توسعه است؛ ورود، فروش، پرداخت، کیف پول و قیمت‌گذاری هنوز پیاده‌سازی نشده‌اند.

## ساختار

- `apps/web`: فرانت Next.js، App Router، React، Tailwind و TypeScript.
- `apps/api`: API با Express و Mongoose؛ مالک قواعد کسب‌وکار و دسترسی به دیتابیس.
- `packages/contracts`: شکل داده‌های عمومی و اعتبارسنجی مشترک با Zod؛ بدون وابستگی به Mongoose.
- `docs`: قواعد تأییدشده، موارد باز و راهنمای توسعه.

## راه‌اندازی

Node.js با نسخهٔ سازگار با `engines` و npm نسخهٔ ۱۰ یا بالاتر نیاز است. برای محیط انتشار از نسخهٔ LTS پشتیبانی‌شده استفاده کنید و بررسی‌ها را روی همان نسخه اجرا کنید.

از ریشهٔ همین پروژه:

```powershell
npm ci
Copy-Item apps/api/.env.example apps/api/.env
npm run dev
```

پیش از اجرای بک‌اند، MongoDB باید در نشانی `MONGODB_URI` در دسترس باشد. فایل `.env` را با اطلاعات واقعی خود تنظیم کنید و در Git قرار ندهید. برای عملیات مالی و رزرو موجودی در مراحل آینده به تراکنش MongoDB و محیط replica set نیاز خواهیم داشت؛ اتصال این مرحله به‌تنهایی آن قابلیت‌ها را فراهم نمی‌کند.

- فرانت: http://localhost:3000
- زنده‌بودن API: http://localhost:4000/api/v1/health/live
- آمادگی API و اتصال دیتابیس: http://localhost:4000/api/v1/health/ready

برنامهٔ API بدون اتصال موفق به MongoDB شروع به سرویس‌دهی نمی‌کند. readiness در صورت قطع اتصال، پاسخ ۵۰۳ می‌دهد. این مسیرها اتصال فرانت به قابلیت‌های فروش را شبیه‌سازی نمی‌کنند.

اگر فقط می‌خواهید صفحهٔ اولیه را ببینید:

```powershell
npm run build -w @raqs/contracts
npm run dev -w @raqs/web
```

## بررسی و ساخت

```powershell
npm run check
npm run build
```

`check` شامل lint، بررسی TypeScript، آزمون API و بررسی قالب‌بندی است. آزمون فعلی به دیتابیس یا سرویس خارجی نیاز ندارد؛ صحت اتصال واقعی MongoDB را اثبات نمی‌کند. بعد از build می‌توان هر برنامه را با `npm run start -w @raqs/api` و `npm run start -w @raqs/web` جدا اجرا کرد.

## نقطهٔ شروع مطالعه

۱. `docs/decisions.md`: توافق‌های کسب‌وکار و موارد حل‌نشده.
۲. `docs/development.md`: مرز ماژول‌ها و روش اضافه‌کردن قابلیت.
۳. `apps/api/src/app.ts`: اتصال مسیرها و مدیریت خطا.
۴. `apps/api/src/modules/health/health.routes.ts`: نمونهٔ کوچک یک ماژول.
۵. `packages/contracts/src/index.ts`: قرارداد پاسخ بین سرویس‌ها.

تنظیمات پایه با مستندات رسمی [Next.js](https://nextjs.org/docs/app/getting-started/installation)، [Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs) و [Express](https://expressjs.com/en/guide/migrating-5/) تطبیق داده شده‌اند. نسخه‌های دقیق نصب‌شده در `package-lock.json` ثبت می‌شوند.

## وضعیت بررسی این نسخه

نصب وابستگی‌ها و اعتبار JSON بررسی شده است؛ اجرای lint، آزمون و build به محدودیت دسترسی محیط ویندوز برخورد کرده و موفقیت آن‌ها تأیید نشده است. پیش از ادامه، [گزارش بررسی](docs/verification.md) را بخوانید و فرمان‌های آن را در محیط مجاز با Node ۲۲ به‌روز اجرا کنید.
