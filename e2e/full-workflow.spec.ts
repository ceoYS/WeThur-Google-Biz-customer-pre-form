import { expect, test, type Locator, type Page } from "@playwright/test";

const fullStackAvailable =
  process.env.PLAYWRIGHT_FULL_STACK === "1" &&
  Boolean(process.env.E2E_ADMIN_STORAGE_STATE);

test("complete administrator and customer case workflow", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(
    !fullStackAvailable,
    "Requires a migrated test Supabase project and an allowlisted administrator storage state.",
  );
  test.skip(
    testInfo.project.name !== "chromium",
    "The complete workflow runs once; responsive coverage is in public smoke tests.",
  );

  const businessName = `가상 E2E 사업장 ${Date.now()}`;
  let intakeUrl = "";
  let caseUrl = "";

  await test.step("1. administrator logs in using a safe pre-authenticated test session", async () => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "사건 대시보드" }),
    ).toBeVisible();
  });

  await test.step("2-5. administrator creates a fictional customized case", async () => {
    await page.getByRole("link", { name: "새 사건 만들기" }).click();
    await page.getByLabel("사업장 이름").fill(businessName);
    await page.getByLabel("고객 이름 또는 호칭").fill("가상 대표님");
    await page.getByLabel("연락 채널").fill("테스트 채널");
    await page.getByLabel("업종 모듈").selectOption({ index: 1 });

    const issueCheckboxes = page
      .getByRole("heading", { name: /이슈 모듈/ })
      .locator("xpath=following-sibling::div[1]")
      .getByRole("checkbox");
    const issueCount = await issueCheckboxes.count();
    for (let index = 0; index < Math.min(3, issueCount); index += 1) {
      await issueCheckboxes.nth(index).check();
    }

    await page.getByRole("button", { name: "알려진 사실 추가" }).click();
    await page.getByLabel("필드 키").fill("official_address");
    await page.getByLabel("값").fill("서울시 가상구 테스트로 1");

    await page.getByRole("button", { name: "프로필 후보 추가" }).click();
    await page.getByLabel("표시된 업체명").fill("가상 사전입력 프로필");
    await page.getByLabel("표시 주소").fill("서울시 가상구 테스트로 1");

    await page.getByRole("button", { name: "고객별 질문 추가" }).click();
    await page.getByLabel("질문 키").fill("custom_context");
    await page
      .getByLabel("고객에게 보일 질문")
      .fill("추가로 설명하고 싶은 내용이 있으신가요?");

    await page.getByRole("button", { name: "보안 링크와 사건 만들기" }).click();
    await expect(
      page.getByRole("heading", { name: "고객 사건을 만들었습니다." }),
    ).toBeVisible();
    const intakeLink = page.locator('a[href*="/intake/"]').first();
    intakeUrl = (await intakeLink.getAttribute("href")) ?? "";
    caseUrl =
      (await page
        .getByRole("link", { name: "사건 화면 열기" })
        .getAttribute("href")) ?? "";
    expect(intakeUrl).toMatch(/\/intake\/[A-Za-z0-9_-]{43}$/);
    expect(intakeUrl).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27}/i);
  });

  await test.step("6-8. customer opens the link, confirms prefilled information, and adds history", async () => {
    await page.goto(intakeUrl);
    await expect(page.getByText(`${businessName} 사전 진단`)).toBeVisible();
    await expectIntakeStep(page, 1);
    await answerRequiredQuestions(page);
    await page.getByRole("button", { name: /다음 질문/ }).click();
    await expectIntakeStep(page, 2);
    await answerRequiredQuestions(page);
    await page.getByRole("button", { name: "과거 등록 이력 추가" }).click();
    const historyCard = page
      .locator("article")
      .filter({ hasText: "등록 이력 1" });
    await fieldIn(historyCard, "언제쯤이었나요?").fill("2025년 봄쯤");
    await fieldIn(historyCard, "누가 진행했나요?").fill("가상 대행사");
    await fieldIn(historyCard, "사용한 프로필 이름").fill("가상 과거 프로필");
    await fieldIn(historyCard, "어떤 결과였나요?").fill("검색에서 사라짐");
  });

  await test.step("9-12. customer adds a current profile, uploads evidence, saves, and resumes", async () => {
    await page.getByRole("button", { name: /여기까지 저장/ }).click();
    await expect(page.getByRole("status")).toContainText(
      "안전하게 저장했습니다",
    );
    await page.reload();
    await expectIntakeStep(page, 1);
    await advance(page, 2);
    const resumed = await page
      .locator("input")
      .evaluateAll((inputs) =>
        inputs.some(
          (input) => (input as HTMLInputElement).value === "2025년 봄쯤",
        ),
      );
    expect(resumed).toBe(true);

    await advance(page, 3);
    await page.getByRole("button", { name: /이전/ }).click();
    await expectIntakeStep(page, 2);
    await advance(page, 3);
    await advance(page, 4);
    await page.getByRole("button", { name: "다른 프로필 후보 추가" }).click();
    const addedProfile = page
      .locator("article")
      .filter({ hasText: "추가한 프로필 후보" })
      .last();
    await fieldIn(addedProfile, "표시된 업체명").fill("가상 현재 프로필");
    await fieldIn(addedProfile, "표시된 주소").fill("서울시 가상구 테스트로 1");
    await fieldIn(addedProfile, "대표님이 직접 관리할 수 있나요?").selectOption(
      "unknown",
    );

    await advance(page, 5);
    await page.locator('input[type="file"]').setInputFiles({
      name: "safe-fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await page.getByRole("button", { name: "비공개로 업로드" }).click();
    await expect(page.getByText("safe-fixture.png")).toBeVisible();
  });

  await test.step("13. customer submits the final response", async () => {
    await advance(page, 6);
    await advance(page, 7);
    await answerRequiredQuestions(page);
    await page.getByRole("button", { name: "최종 제출하기" }).click();
    await expect(
      page.getByRole("heading", { name: /내용이 정상적으로 전달되었습니다/ }),
    ).toBeVisible();
  });

  await test.step("14. duplicate submission is rejected", async () => {
    const token = new URL(intakeUrl).pathname.split("/").pop() ?? "";
    const response = await page.request.post(`/api/intake/${token}/submit`, {
      headers: { Origin: new URL(intakeUrl).origin },
      data: {
        schemaVersion: 1,
        answers: {},
        historyEvents: [],
        profileCandidates: [],
        thirdParties: [],
        website: "",
      },
    });
    expect(response.status()).toBe(409);
  });

  await test.step("15-18. administrator reviews timeline, comparison, hypotheses, and missing information", async () => {
    await page.goto(caseUrl);
    await expect(page.getByText(businessName)).toBeVisible();
    await page.getByRole("link", { name: /과거 이력/ }).click();
    await expect(page.getByText("가상 과거 프로필")).toBeVisible();
    await page.getByRole("link", { name: /현재 프로필 비교/ }).click();
    await expect(page.getByText("가상 현재 프로필")).toBeVisible();
    await page.getByRole("link", { name: /원인 가설/ }).click();
    await expect(
      page.getByText("아직 단정하면 안 되는 점").first(),
    ).toBeVisible();
    await page.getByRole("link", { name: /부족한 정보/ }).click();
    await expect(
      page.getByRole("heading", { name: "부족한 정보" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /고객 추가 질문/ }).click();
    const createDraft = page
      .getByRole("button", { name: "요청 초안 만들기" })
      .first();
    if (await createDraft.isVisible()) await createDraft.click();
  });

  await test.step("19. a customer without an admin session cannot access admin pages", async () => {
    const context = await browser.newContext({
      baseURL: new URL(page.url()).origin,
    });
    const customerPage = await context.newPage();
    await customerPage.goto("/admin");
    await expect(customerPage).toHaveURL(/\/admin\/login/);
    await context.close();
  });

  await test.step("20. attachment storage is private and only short-lived signed access is returned", async () => {
    await page.goto(`${caseUrl}?tab=evidence`);
    const signedResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/signed-url") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: /60초 링크로 열기/ })
      .first()
      .click();
    const signedResponse = await signedResponsePromise;
    const body = (await signedResponse.json()) as {
      signedUrl: string;
      expiresIn: number;
    };
    expect(body.expiresIn).toBe(60);
    expect(body.signedUrl).toContain("/object/sign/");
    const unsignedUrl = body.signedUrl.split("?")[0] ?? body.signedUrl;
    const context = await browser.newContext();
    const unsignedResponse = await context.request.get(unsignedUrl);
    expect(unsignedResponse.ok()).toBe(false);
    await context.close();
  });
});

async function advance(page: Page, expectedStep: number) {
  await answerRequiredQuestions(page);
  await page.getByRole("button", { name: /다음 질문/ }).click();
  await expectIntakeStep(page, expectedStep);
}

async function expectIntakeStep(page: Page, expectedStep: number) {
  const counter = `${String(expectedStep).padStart(2, "0")} / 07`;
  const progress = Math.round((expectedStep / 7) * 100);
  await expect(page.getByText(counter, { exact: true })).toBeVisible();
  await expect(page.getByText(`${progress}%`, { exact: true })).toBeVisible();
}

async function answerRequiredQuestions(page: Page) {
  const requiredLabels = page.locator("label").filter({ hasText: "필수" });
  const count = await requiredLabels.count();
  for (let index = 0; index < count; index += 1) {
    const block = requiredLabels.nth(index).locator("xpath=../..");
    const input = block
      .locator('input:not([type="checkbox"]):not([type="radio"])')
      .first();
    const textarea = block.locator("textarea").first();
    const checkbox = block.locator('input[type="checkbox"]').first();
    if (await input.count()) await input.fill("확인이 필요해요");
    else if (await textarea.count())
      await textarea.fill("기억나는 범위에서 작성한 가상 테스트 답변입니다.");
    else if (await checkbox.count()) await checkbox.check();
    else {
      const preferred = block
        .getByRole("button", {
          name: /잘 모르겠어요|확인이 필요해요|맞아요|네/,
        })
        .first();
      if (await preferred.count()) await preferred.click();
      else await block.getByRole("button").first().click();
    }
  }
}

function fieldIn(container: Locator, label: string) {
  return container
    .getByText(label, { exact: true })
    .locator("xpath=..")
    .locator("input, textarea, select")
    .first();
}
