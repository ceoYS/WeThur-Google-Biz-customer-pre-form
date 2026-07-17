import { expect, test } from "@playwright/test";

test("public introduction and privacy pages are responsive", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const homeResponse = await page.goto("/");
  expect(homeResponse?.status()).toBe(200);
  await expect(page).toHaveTitle(/WeThru Google Business Profile Diagnosis/);
  await expect(
    page.getByRole("heading", { name: /문제를 다시 만들지 않도록/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Google 비밀번호·OTP·복구 코드는 요청하지 않습니다."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /개인정보 및 보관 안내/ }),
  ).toBeVisible();
  const viewportFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(viewportFits).toBe(true);

  const privacyResponse = await page.goto("/privacy");
  expect(privacyResponse?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "개인정보와 자료 보관 안내" }),
  ).toBeVisible();
  await expect(page.getByText(/Google 비밀번호, OTP, 복구 코드/)).toBeVisible();
  await expect(
    page.locator('[data-nextjs-dialog-overlay][data-rendered="true"]'),
  ).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test("auth entry points fail closed without browser errors", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  for (const path of ["/auth/confirm", "/auth/callback"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(
      /\/admin\/login\?error=(invalid_link|configuration_error)$/,
    );
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.locator('[data-nextjs-dialog-overlay][data-rendered="true"]'),
    ).toHaveCount(0);

    const redirectUrl = new URL(page.url());
    expect([...redirectUrl.searchParams.keys()]).toEqual(["error"]);
  }

  expect(browserErrors).toEqual([]);
});

test("admin and intake route groups declare noindex", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const response = await page.goto("/admin/login");
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.getByRole("heading", { name: "관리자 로그인" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-nextjs-dialog-overlay][data-rendered="true"]'),
  ).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test("administrator login handles invalid links without runtime errors", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(
    "/auth/confirm?token_hash=invalid&type=email&next=//example.test",
  );

  await expect(page).toHaveURL(/\/admin\/login\?error=invalid_link$/);
  await expect(page.getByRole("alert")).toContainText(
    "올바르지 않은 로그인 링크입니다.",
  );
  await expect(
    page.locator('[data-nextjs-dialog-overlay][data-rendered="true"]'),
  ).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test("magic-link request remains disabled while its server action is pending", async ({
  page,
}) => {
  await page.goto("/admin/login");
  const email = page.getByLabel("관리자 이메일");
  const submit = page.locator('button[type="submit"]');

  test.skip(
    await submit.isDisabled(),
    "Requires public Supabase test settings.",
  );

  let releaseRequest: (() => void) | undefined;
  const requestPaused = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  let observedPost: (() => void) | undefined;
  const postObserved = new Promise<void>((resolve) => {
    observedPost = resolve;
  });

  await page.route("**/admin/login", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    observedPost?.();
    await requestPaused;
    await route.continue();
  });

  await email.fill(`pending-check-${Date.now()}@example.test`);
  const click = submit.click();
  await postObserved;
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveText("로그인 링크 요청 중");
  releaseRequest?.();
  await click;
  await expect(page.getByRole("status")).toContainText(
    "허용된 관리자 이메일이라면",
  );
});
