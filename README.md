# رقص مو

فروشگاه چندتأمین‌کننده‌ای با مدیریت مرکزی. ساختار پروژه و بک‌اند ورود با موبایل پیاده شده‌اند؛ ارسال پیامک واقعی هنوز متصل نیست و صفحهٔ فعلی فرانت فقط نمای اولیه است. فروش، پرداخت، قیمت‌گذاری، کیف پول و تسویه مراحل بعدی هستند.

## ساختار

- `apps/web`: فرانت Next.js، App Router، React، Tailwind و TypeScript.
- `apps/api`: Express و Mongoose؛ مالک قواعد کسب‌وکار، احراز هویت و دسترسی به دیتابیس.
- `packages/contracts`: قراردادها و اعتبارسنجی داده‌های عمومی با Zod؛ بدون وابستگی به Mongoose.
- `docs`: قواعد تأییدشده، موارد باز و راهنمای توسعه.

## راه‌اندازی

از Node ۲۲ به‌روز و npm نسخهٔ ۱۰ یا بالاتر استفاده کنید. `.nvmrc` نسخهٔ اصلی مورد استفادهٔ تیم و CI را مشخص می‌کند.

از ریشهٔ پروژه:

```powershell
npm ci
Copy-Item apps/api/.env.example apps/api/.env
```

MongoDB باید در نشانی MONGODB_URI در دسترس باشد. پیش از اجرای بک‌اند، AUTH_SECRET را با یک مقدار تصادفی و محرمانهٔ حداقل ۳۲ کاراکتری و WEB_ORIGIN را با مبدأ دقیق فرانت تنظیم کنید؛ [راهنمای ورود](docs/authentication.md) روش تولید کلید را توضیح می‌دهد. `.env` را در Git قرار ندهید. سپس:

```powershell
npm run dev
```

- فرانت: http://localhost:3000
- زنده‌بودن API: http://localhost:4000/api/v1/health/live
- آمادگی API و اتصال دیتابیس: http://localhost:4000/api/v1/health/ready

API بدون اتصال موفق به MongoDB، تنظیمات معتبر و ساخت ایندکس‌های لازم شروع نمی‌شود. readiness در صورت قطع اتصال، پاسخ ۵۰۳ می‌دهد. برای عملیات مالی و رزرو موجودی در مراحل آینده به MongoDB replica set و تراکنش نیاز خواهیم داشت.

اگر فقط می‌خواهید صفحهٔ اولیه را ببینید:

```powershell
npm run build -w @raqs/contracts
npm run dev -w @raqs/web
```

## وضعیت ورود

چهار مسیر درخواست کد، تأیید کد، حساب جاری و خروج در `/api/v1/auth` وجود دارند. تا زمان انتخاب و اتصال سرویس پیامک، درخواست کد پاسخ روشن ۵۰۳ می‌دهد؛ هیچ کد ثابت، ارسال ساختگی یا در پشتی در برنامه وجود ندارد. فرستندهٔ آزمایشی فقط در آزمون‌ها استفاده می‌شود. جزئیات مسیرها و محدودیت‌ها در [راهنمای ورود](docs/authentication.md) آمده است.

## بررسی و ساخت

```powershell
npm run check
npm run test:integration
npm run build
```

`check` شامل lint، بررسی TypeScript، هشت آزمون مستقل از دیتابیس و بررسی قالب‌بندی است. آزمون یکپارچه نه سناریو را روی MongoDB واقعی در دیتابیس موقت و اختصاصی بررسی می‌کند؛ این دیتابیس در پایان حذف می‌شود. پیامک واقعی ارسال نمی‌شود. CI نیز MongoDB ۷ را برای همین آزمون‌ها اجرا می‌کند.

بعد از build می‌توان هر برنامه را با `npm run start -w @raqs/api` و `npm run start -w @raqs/web` جدا اجرا کرد. مسیرهای مربوط به قیمت، سفارش و پول هنوز پیاده نشده‌اند.

## نقطهٔ شروع مطالعه

۱. `docs/decisions.md`: توافق‌های کسب‌وکار و موارد حل‌نشده.
۲. `docs/development.md`: مرز ماژول‌ها و روش اضافه‌کردن قابلیت.
۳. `docs/authentication.md`: جریان ورود، تنظیمات، آزمون‌ها و کارهای باقی‌مانده.
۴. `apps/api/src/app.ts`: اتصال مسیرها و مدیریت خطا.
۵. `packages/contracts/src/auth.ts`: نمونهٔ قرارداد مشترک فرانت و بک.

تنظیمات پایه با مستندات رسمی [Next.js](https://nextjs.org/docs/app/getting-started/installation)، [Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs) و [Express](https://expressjs.com/en/guide/migrating-5/) تطبیق داده شده‌اند. نسخه‌های دقیق وابستگی‌ها در package-lock.json ثبت می‌شوند. نتیجهٔ بررسی‌های این مرحله در [گزارش بررسی](docs/verification.md) آمده است.
