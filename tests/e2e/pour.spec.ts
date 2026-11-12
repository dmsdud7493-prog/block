/** 따르는 줄기 회귀 — 붓는 단계 화면이 오래 머물러도(일시정지) 물줄기가 계속 흐르지 않아야 한다 */
import { expect, test, type Page } from "@playwright/test";
import { item, qty, workspace } from "./workspace";

async function loadAndRun(page: Page, slug: string, state: object) {
  await page.goto(`/demo/${slug}`);
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), state);
  await page.waitForTimeout(500); // 블록 변경이 화면 상태에 반영될 때까지(200ms 디바운스)
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

test("밀도: 빈 눈금실린더에 물을 부으면 바닥부터 점점 차오른다", async ({ page }) => {
  const D = "density";
  await loadAndRun(page, D, workspace(D, [
    { action: "a2", inputs: [item(D, "water"), qty("mL", 50)] },
    { action: "a8", inputs: [item(D, "cylinder")] },
  ]));
  const liquid = page.locator(".monitor-screen .lab-liquid").first();
  await liquid.waitFor({ state: "attached" });
  const ys = await liquid.evaluate(async (el) => {
    const read = () => new DOMMatrixReadOnly(getComputedStyle(el).transform).f;
    const seen = [read()];
    for (let i = 0; i < 16; i += 1) {
      await new Promise((r) => setTimeout(r, 90));
      seen.push(read());
    }
    return seen;
  });
  // 처음에는 바닥 근처(큰 y)였다가 점점 올라온다(작은 y)
  expect(ys[0] - Math.min(...ys)).toBeGreaterThan(20);
});

test("실행한 뒤 블록 하나를 누르면 그 행동만 다시 실행한다(빈칸 속 준비물을 눌러도)", async ({ page }) => {
  const D = "density";
  await loadAndRun(page, D, workspace(D, [
    { action: "a4", id: "mass1", inputs: [item(D, "iron_big")] },
    { action: "a2", id: "pour1", inputs: [item(D, "water"), qty("mL", 50)] },
  ]));
  const log = page.getByRole("list", { name: "실험 기록" });
  const items = log.getByRole("listitem");
  await expect(items).toHaveCount(2, { timeout: 10_000 });
  await expect(page.getByRole("button", { name: /이어 보기/ })).toBeVisible({ timeout: 10_000 });

  // 질량 재기 블록을 누르면 그 단계만 다시 보여 주고 멈춘다(붓기 전 상태)
  await page.locator('g[data-id="mass1"] > .blocklyPath').first().click({ position: { x: 6, y: 12 }, force: true });
  await expect(items).toHaveCount(1);
  await expect(page.locator(".monitor-screen .lab-pour-life")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /이어 보기/ })).toBeVisible({ timeout: 5000 });
  await expect(items).toHaveCount(1);

  // 빈칸 속 준비물(물)을 눌러도 그 붓기 행동만 다시 실행된다 — 물줄기가 다시 흐른다
  await page.locator('g[data-id="pour1"] g.item_density_water').first().click({ force: true });
  await expect(page.locator(".monitor-screen .lab-pour-life")).toHaveCount(1);
  await expect(items).toHaveCount(2);

  // 같은 블록을 한 번 더 눌러도 다시 실행된다
  await expect(page.getByRole("button", { name: /이어 보기/ })).toBeVisible({ timeout: 5000 });
  await page.locator('g[data-id="mass1"] > .blocklyPath').first().click({ position: { x: 6, y: 12 }, force: true });
  await expect(items).toHaveCount(1);
  await page.locator('g[data-id="mass1"] > .blocklyPath').first().click({ position: { x: 6, y: 12 }, force: true });
  await expect(items).toHaveCount(1);
});

test("밀도: 식용유가 든 비커에 물을 부으면 물방울이 식용유를 뚫고 가라앉는 장면이 오래 보인다", async ({ page }) => {
  const D = "density";
  await loadAndRun(page, D, workspace(D, [
    { action: "a6", inputs: [item(D, "beaker"), item(D, "oil"), qty("mL", 50)] },
    { action: "a6", inputs: [item(D, "beaker"), item(D, "water"), qty("mL", 50)] },
  ]));
  const drops = page.locator(".monitor-screen .lab-sink-drop");
  await expect(drops.first()).toBeAttached({ timeout: 10_000 });
  await expect(page.locator(".monitor-screen").getByText("⬇ 물이 아래로 가라앉아요")).toBeAttached();
  // 층이 천천히 자리를 바꾼다(가라앉는 장면에서만 느린 전환)
  await expect(page.locator(".monitor-screen .lab-liquid.lab-sink")).toHaveCount(2);
  // 보통 단계(1.6초)보다 오래 머문다 — 2.4초 뒤에도 아직 그 장면
  await page.waitForTimeout(2400);
  await expect(drops.first()).toBeAttached();
});

test("밀도 미션 ②: 철조각을 넣으면 핀셋에서 놓인 조각은 손에서 사라지고, 결과 칸은 두 철조각 비교를 묻는다", async ({ page }) => {
  const D = "density";
  const iron = (x: string) => [
    { action: "a4", inputs: [item(D, x)] },
    { action: "a2", inputs: [item(D, "water"), qty("mL", 50)] },
    { action: "a7", inputs: [item(D, x), item(D, "cylinder")] },
    { action: "a8", inputs: [item(D, "cylinder")] },
    { action: "a5" },
  ];
  await loadAndRun(page, D, workspace(D, [...iron("iron_big"), ...iron("iron_small")]));
  const tip = page.locator(".monitor-screen .lab-tip-release");
  await tip.first().waitFor({ state: "attached", timeout: 15_000 });
  await page.getByRole("button", { name: /일시정지/ }).click();
  await page.waitForTimeout(2000);
  expect(await tip.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity))).toEqual(["0"]);
  await page.getByRole("button", { name: /이어 보기/ }).click();
  await expect(page.getByRole("heading", { name: "🔩 큰 철조각과 작은 철조각의 밀도는 어떨까?" })).toBeVisible({ timeout: 40_000 });
  await expect(page.getByRole("heading", { name: /한 비커에 담으면/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /실행 기록/ })).toHaveCount(0);
});
