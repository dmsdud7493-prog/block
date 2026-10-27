/**
 * 밀도 실험 전체 흐름 (plan S2·S5 수용 기준):
 * 블록 → 실시간 점검 → 예측 게이트(3.1) → 실행·모니터 → 측정값 표 → 계산값 오답 안내(5.3) → 정답
 * → 그래프 전 예측 → 그래프 → 예상과 비교(3.3) → 보고서(초안 옮기기·성찰·제출 체크리스트, S6)
 */
import { expect, test, type Page } from "@playwright/test";
import { item, qty, workspace } from "./workspace";

const D = "density";
const ironSteps = (iron: string) => [
  { action: "a4", inputs: [item(D, iron)] },
  { action: "a2", inputs: [item(D, "water"), qty("mL", 50)] },
  { action: "a7", inputs: [item(D, iron), item(D, "cylinder")] },
  { action: "a8", inputs: [item(D, "cylinder")] },
  { action: "a5" },
];
const vars = [
  { role: "independent", option: "iron_size", why: "크기만 바꿔 비교" },
  { role: "dependent", option: "density" },
  { role: "controlled", option: "liquid_volume", why: "공정하게" },
];

async function load(page: Page, state: object) {
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), state);
}

async function predict(page: Page, choiceText: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /힌트 1/ }).click();
  await expect(dialog.getByText(/힌트 1:/)).toBeVisible();
  await dialog.getByLabel(choiceText).check();
  await dialog.getByLabel(/왜 그렇게 생각했나요/).fill("왜냐하면 같은 물질이니까");
  await dialog.getByRole("button", { name: "예상 저장하기" }).click();
}

test("밀도: 설계부터 보고서까지", async ({ page }) => {
  await page.goto("/demo/density");
  await load(page, workspace(D, [...ironSteps("iron_big"), ...ironSteps("iron_small")], vars));
  await expect(page.getByText("점검 결과: 지금은 걸리는 곳이 없어요.")).toBeVisible();

  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  await predict(page, "두 철조각의 밀도는 같다");

  const table = page.getByRole("table").filter({ hasText: "실험 1회차 결과" });
  await expect(table).toBeVisible({ timeout: 20_000 });
  const row = table.getByRole("row").filter({ hasText: "큰 철조각" });
  const text = await row.locator("td").nth(1).innerText();
  const mass = Number(/질량 ([\d.]+)/.exec(text)![1]);
  const vol = Number(/부피 ([\d.]+)/.exec(text)![1]);

  const input = row.getByLabel("밀도 값");
  await input.fill((vol / mass).toFixed(2));
  await row.getByLabel("밀도 단위").selectOption("g/mL");
  await row.getByRole("button", { name: "확인" }).click();
  await expect(row.getByText(/나누는 순서/)).toBeVisible();
  await expect(row.getByText(/틀렸|오답/)).toHaveCount(0);

  await input.fill((mass / vol).toFixed(2));
  await row.getByRole("button", { name: "확인" }).click();
  await expect(row.getByText("✓ 좋아요! 계산이 맞아요.")).toBeVisible();

  await page.getByRole("button", { name: "📈 그래프 그리기" }).click();
  await predict(page, "아래부터 철조각 → 물 → 식용유");
  await expect(page.getByRole("figure", { name: /결과 그래프/ })).toBeVisible();

  const report = page.getByRole("button", { name: /보고서 쓰러 가기/ });
  await expect(report).toBeDisabled();
  for (const box of await page.locator("section[aria-labelledby=after-title] li").all()) {
    await box.getByLabel("예상과 같았어요").check();
    await box.getByRole("textbox").fill("두 철조각 모두 7.9 근처로 같았다");
    await box.getByRole("button", { name: "저장" }).click();
  }
  await expect(report).toBeEnabled();

  // S6: 보고서 — 기록이 초안으로 옮겨지고, 해석·성찰은 비어 있으며, 체크리스트가 채워져야 제출 조건 충족
  await report.click();
  await expect(page.getByRole("heading", { name: /탐구 보고서/ })).toBeVisible();
  await expect(page.locator("#r-procedure")).toHaveValue(/1\. /);
  await expect(page.locator("#r-results")).toHaveValue(/큰 철조각/);
  await expect(page.locator("#r-evidence")).toHaveValue("");
  const gate = page.locator("section[aria-labelledby=submit-title]");
  await expect(gate.getByText(/아직: 성찰 질문 4개 중 3개 이상/)).toBeVisible();
  await page.getByLabel("가설이 지지되었다").check();
  await page.locator("#r-evidence").fill("표의 밀도 7.9 g/mL 두 값");
  await page.locator("#r-error").fill("눈금을 읽을 때 오차");
  await page.locator("#r-improve").fill("여러 번 재서 평균");
  for (const id of ["diff", "hardest", "curious"]) await page.locator(`#r-ref-${id}`).fill("예상과 결과를 비교하며 생각한 점");
  await expect(gate.getByText(/완료: 성찰 질문 4개 중 3개 이상/)).toBeVisible();
  await expect(gate.getByRole("button", { name: "제출하기" })).toBeDisabled();
  await expect(gate.getByText(/체험 모드에서는 제출되지 않아요/)).toBeVisible();
});

test("예측 없이 실행 API를 부르면 403 (지침 3.1 서버 가드)", async ({ request }) => {
  const res = await request.post("/api/demo/run", { data: { slug: "density", seed: "seed-1234", runNo: 1, program: { experiment: "density", steps: [], variables: [] }, predictions: [] } });
  expect(res.status()).toBe(403);
  expect((await res.json()).error.code).toBe("prediction_required");
});

test("실행 오류: 영점조정 없이 질량 측정 → 그 블록에서 멈추고 이유 표시", async ({ page }) => {
  await page.goto("/demo/density");
  await load(page, workspace(D, [
    { action: "a2", inputs: [item(D, "water"), qty("mL", 50)] },
    { action: "a4", inputs: [item(D, "water")], id: "bad" },
  ]));
  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  await predict(page, "두 철조각의 밀도는 같다");
  await expect(page.getByRole("alert").filter({ hasText: "전자저울 위에 용기가 없어요" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("g.lab-block-error")).toHaveCount(1);
});
