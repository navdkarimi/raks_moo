import { expect, test, type APIRequestContext } from "@playwright/test";

const headers = () => ({ "x-e2e-key": process.env.RAQS_E2E_KEY! });
let phoneSequence = 2000000;
const nextMobile = () => `0912${phoneSequence++}`;

async function codeFor(
  request: APIRequestContext,
  mobile: string,
): Promise<string> {
  const response = await request.get("http://127.0.0.1:4100/__test/otp", {
    headers: headers(),
    params: { mobile: `+98${mobile.slice(1)}` },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.code;
}

test.beforeEach(async ({ request }) => {
  const response = await request.post("http://127.0.0.1:4100/__test/sms", {
    headers: headers(),
    data: { available: true },
  });
  expect(response.status()).toBe(204);
});

test("mobile layout validates the phone and reports real SMS unavailability", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  const phone = page.getByLabel("شمارهٔ موبایل", { exact: true });
  await phone.fill("123");
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(
    page.getByRole("region", { name: "حساب کاربری" }).getByRole("alert"),
  ).toContainText("شمارهٔ موبایل معتبر");
  await request.post("http://127.0.0.1:4100/__test/sms", {
    headers: headers(),
    data: { available: false },
  });
  await phone.fill(nextMobile());
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(
    page.getByRole("region", { name: "حساب کاربری" }).getByRole("alert"),
  ).toContainText("ارسال پیامک فعلاً در دسترس نیست");
  await expect(page.getByLabel("کد شش‌رقمی", { exact: true })).toHaveCount(0);
  const width = await page.evaluate(() => ({
    body: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.body).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
});

test("Persian input, wrong code, successful login, reload and logout use the real API", async ({
  page,
  request,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const mobile = nextMobile();
  await page.goto("/login");
  await page
    .getByLabel("شمارهٔ موبایل", { exact: true })
    .fill(mobile.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]!));
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  const input = page.getByLabel("کد شش‌رقمی", { exact: true });
  await expect(input).toBeFocused();
  const code = await codeFor(request, mobile);
  await input.fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "تأیید و ورود" }).click();
  await expect(
    page.getByRole("region", { name: "حساب کاربری" }).getByRole("alert"),
  ).toContainText("کد نامعتبر");
  await input.fill(
    code.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]!),
  );
  await page.getByRole("button", { name: "تأیید و ورود" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("با موفقیت وارد حساب شدید.")).toBeVisible();
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "raqs_session")
      ?.httpOnly,
  ).toBe(true);
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
  await page.reload();
  await expect(page.getByText(mobile, { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/account-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "خروج از حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
  expect(errors).toEqual([]);
});

test("anonymous account visits return to login", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("شمارهٔ موبایل", { exact: true })).toBeVisible();
});

test("resending replaces the challenge, clears the code and can complete login", async ({
  page,
  request,
}) => {
  const mobile = nextMobile();
  await page.goto("/login");
  await page.getByLabel("شمارهٔ موبایل", { exact: true }).fill(mobile);
  const firstResponse = page.waitForResponse((response) =>
    response.url().endsWith("/otp/request"),
  );
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  const first = await (await firstResponse).json();
  await page.getByLabel("کد شش‌رقمی", { exact: true }).fill("123456");
  const resend = page.getByRole("button", {
    name: "ارسال مجدد کد",
    exact: true,
  });
  await expect(resend).toBeEnabled();
  const secondResponse = page.waitForResponse((response) =>
    response.url().endsWith("/otp/request"),
  );
  await resend.click();
  const second = await (await secondResponse).json();
  expect(second.challengeId).not.toBe(first.challengeId);
  await expect(page.getByLabel("کد شش‌رقمی", { exact: true })).toHaveValue("");
  await page
    .getByLabel("کد شش‌رقمی", { exact: true })
    .fill(await codeFor(request, mobile));
  await page.getByRole("button", { name: "تأیید و ورود" }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test("expired UI disables verification and editing returns to the phone field", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/login");
  const mobile = nextMobile();
  await page.getByLabel("شمارهٔ موبایل", { exact: true }).fill(mobile);
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(page.getByLabel("کد شش‌رقمی", { exact: true })).toBeVisible();
  await page.clock.fastForward(121_000);
  await expect(
    page.getByRole("button", { name: "تأیید و ورود" }),
  ).toBeDisabled();
  await expect(
    page.getByText("اعتبار کد تمام شده است. یک کد جدید درخواست کنید."),
  ).toBeVisible();
  await page.getByRole("button", { name: "ویرایش شماره" }).click();
  await expect(page.getByLabel("شمارهٔ موبایل", { exact: true })).toHaveValue(
    mobile,
  );
  await expect(page.getByLabel("شمارهٔ موبایل", { exact: true })).toBeFocused();
});
