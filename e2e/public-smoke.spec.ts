import { expect, test } from "@playwright/test";

test("public introduction and privacy pages are responsive", async ({
  page,
}) => {
  await page.goto("/");
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

  await page.getByRole("link", { name: /개인정보 및 보관 안내/ }).click();
  await expect(
    page.getByRole("heading", { name: "개인정보와 자료 보관 안내" }),
  ).toBeVisible();
  await expect(page.getByText(/Google 비밀번호, OTP, 복구 코드/)).toBeVisible();
});

test("admin and intake route groups declare noindex", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.getByRole("heading", { name: "관리자 로그인" }),
  ).toBeVisible();
});
