/** 따르는 줄기 회귀 — 붓는 단계 화면이 오래 머물러도(일시정지) 물줄기가 계속 흐르지 않아야 한다 */
import { expect, test, type Page } from "@playwright/test";
import { item, qty, workspace } from "./workspace";

async function loadAndRun(page: Page, slug: string, state: object) {
  await page.goto(`/demo/${slug}`);
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), state);
  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole("radio").first().check();
    await page.getByLabel(/왜 그렇게/).fill("왜냐하면 그럴 것 같아서");
    await page.getByRole("button", { name: "예상 저장하기" }).click();
  }
}

const opacities = (page: Page) =>
  page.locator(".monitor-screen .lab-pour-life").evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));

test("밀도: 물을 다 부은 뒤 멈춰 있으면 물줄기가 사라진다", async ({ page }) => {
  const D = "density";
  await loadAndRun(page, D, workspace(D, [
    { action: "a2", inputs: [item(D, "water"), qty("mL", 50)] },
    { action: "a8", inputs: [item(D, "cylinder")] },
  ]));
  await page.locator(".monitor-screen .lab-pour-life").first().waitFor({ state: "attached" });
  // 붓는 동안에는 물줄기가 보인다
  await expect.poll(async () => (await opacities(page)).some((o) => Number(o) > 0.9), { timeout: 3000, intervals: [50] }).toBe(true);
  await page.getByRole("button", { name: /일시정지/ }).click();
  await page.waitForTimeout(2500);
  const ops = await opacities(page);
  expect(ops.length).toBeGreaterThan(0);
  expect(ops.every((o) => o === "0")).toBe(true);
});
