/** 용해도 미션 ③ — 얼음물·실온·뜨거운 물에서 질산 칼륨 녹이기 (사용자 요청 2026-11-13) */
import { test, expect } from "@playwright/test";
import { item, qty, workspace, type ActionSpec } from "./workspace";

const D = "solubility";
const tube = (id: string, bath: string | null, first: number, each: number, tare = false): ActionSpec[] => [
  { action: "a1", inputs: [item(D, id), item(D, "water"), qty("g", 10)] },
  ...(bath ? [{ action: "a7", inputs: [item(D, id), item(D, bath)] }] : []),
  ...(tare ? [{ action: "a2", inputs: [item(D, "scale"), item(D, "weighing_paper")] }] : []),
  { action: "a3", inputs: [item(D, "kno3"), qty("g", first), item(D, "spatula")] },
  { action: "a4", inputs: [item(D, "kno3"), item(D, id)] },
  { action: "a5", inputs: [item(D, "kno3"), qty("g", each)] },
  { action: "a6", inputs: [item(D, "kno3")] },
];

test("용해도 미션 ③: 오늘의 미션에 온도 비교가 있고, 얼음물·뜨거운 물을 쓰면 온도 예측을 묻고, 세 온도에서 기록된다", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`/demo/${D}`);
  await expect(page.getByRole("region", { name: "오늘의 미션" })).toContainText("얼음물·실온·뜨거운 물");
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), workspace(D, [
    ...tube("tube_a", "ice_water", 1, 0.1, true), ...tube("tube_b", null, 2, 0.1), ...tube("tube_c", "hot_water", 8, 0.2),
  ]));
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("얼음물(약 0 °C), 실온(20 °C), 뜨거운 물(약 60 °C)");
  await dialog.getByRole("radio").first().check();
  await page.getByLabel(/왜 그렇게/).fill("따뜻하면 더 잘 녹을 것 같아서");
  await dialog.getByRole("button", { name: /이 카드로 결정/ }).click();
  await page.getByRole("button", { name: "2×" }).click().catch(() => undefined);
  const log = page.getByRole("list", { name: "실험 기록" });
  await expect(log.getByText(/시험관 C을\(를\)|시험관 C를 뜨거운 물/).first()).toBeVisible({ timeout: 60_000 });
  await expect(log.getByText(/넣은 질산 칼륨의 총량을 표에 기록했어요/)).toHaveCount(3, { timeout: 60_000 });
});

test("용해도 미션 ①만 마치면 그래프 대신 '미션 2 하러 가기' — 그래프는 미션 ③까지 마친 뒤", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`/demo/${D}`);
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), workspace(D, tube("tube_a", null, 1, 0.5, true)));
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio").first().check();
  await page.getByLabel(/왜 그렇게/).fill("알갱이가 더 고와 보여서");
  await dialog.getByRole("button", { name: /이 카드로 결정/ }).click();
  const table = page.getByRole("table").filter({ hasText: "실험 1회차 결과" });
  await expect(table).toBeVisible({ timeout: 40_000 });
  await expect(page.getByRole("button", { name: /그래프 그리기/ })).toHaveCount(0);
  await expect(page.getByText("🎯 오늘의 미션을 마치면 다음 단계가 열려요.")).toBeVisible();
  const text = await table.innerText();
  const water = Number(/물의 질량 ([\d.]+)/.exec(text)![1]);
  const dissolved = Number(/녹은 양 ([\d.]+)/.exec(text)![1]);
  await table.getByLabel("물 100 g에 녹는 양 값").fill(((dissolved / water) * 100).toFixed(1));
  await table.getByLabel("물 100 g에 녹는 양 단위").selectOption("g/물 100 g");
  await table.getByRole("button", { name: "확인" }).click();
  await expect(page.getByRole("button", { name: "🎯 미션 2 하러 가기" })).toBeVisible();
  await expect(page.getByRole("button", { name: /그래프 그리기/ })).toHaveCount(0);
});
