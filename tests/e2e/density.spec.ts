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
  await page.waitForTimeout(500); // 블록 변경이 화면 상태에 반영될 때까지(200ms 디바운스)
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

const liquidSteps = (liq: string) => [
  { action: "a1", inputs: [item(D, "cylinder"), item(D, "scale")] },
  { action: "a2", inputs: [item(D, liq), qty("mL", 50)] },
  { action: "a3", inputs: [item(D, liq)] },
  { action: "a4", inputs: [item(D, liq)] },
  { action: "a5" },
];
const togetherSteps = [
  { action: "a6", inputs: [item(D, "beaker"), item(D, "oil"), qty("mL", 50)] },
  { action: "a6", inputs: [item(D, "beaker"), item(D, "water"), qty("mL", 50)] },
  { action: "a7", inputs: [item(D, "iron_big"), item(D, "beaker")] },
  { action: "a7", inputs: [item(D, "iron_small"), item(D, "beaker")] },
];

async function answerAll(page: Page) {
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 4 && (await dialog.isVisible().catch(() => false)); i += 1) {
    await dialog.getByRole("radio").first().check();
    await dialog.getByLabel(/왜 그렇게 생각했나요/).fill("왜냐하면 무거운 게 가라앉으니까");
    await dialog.getByRole("button", { name: "예상 저장하기" }).click();
    await page.waitForTimeout(300);
  }
}

/** 표에서 이 물질의 질량·부피를 읽어 밀도를 맞게 입력한다 */
async function solve(page: Page, name: string) {
  const table = page.getByRole("table").filter({ hasText: "실험 1회차 결과" });
  const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name, exact: true }) });
  const text = await row.getByRole("cell").filter({ hasText: "질량" }).innerText();
  const mass = Number(/질량 ([\d.]+)/.exec(text)![1]);
  const vol = Number(/부피 ([\d.]+)/.exec(text)![1]);
  await row.getByLabel("밀도 값").fill((mass / vol).toFixed(2));
  await row.getByLabel("밀도 단위").selectOption("g/mL");
  await row.getByRole("button", { name: "확인" }).click();
  await expect(row.getByText("✓ 좋아요! 계산이 맞아요.")).toBeVisible();
}

test("밀도: 설계부터 보고서까지 — 미션 셋을 마치면 보고서 한 장(활동 1·2·3)", async ({ page }) => {
  await page.goto("/demo/density");
  await load(page, workspace(D, [...liquidSteps("water"), ...liquidSteps("oil"), ...ironSteps("iron_big"), ...ironSteps("iron_small"), ...togetherSteps], vars));
  await expect(page.getByText("점검 결과: 지금은 걸리는 곳이 없어요.")).toBeVisible();

  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  await answerAll(page);

  const table = page.getByRole("table").filter({ hasText: "실험 1회차 결과" });
  await expect(table).toBeVisible({ timeout: 40_000 });
  const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "큰 철조각", exact: true }) });
  const text = await row.getByRole("cell").filter({ hasText: "질량" }).innerText();
  const mass = Number(/질량 ([\d.]+)/.exec(text)![1]);
  const vol = Number(/부피 ([\d.]+)/.exec(text)![1]);

  // 나누는 순서를 거꾸로 하면 오류 유형만 안내한다(정답값은 보이지 않음)
  await row.getByLabel("밀도 값").fill((vol / mass).toFixed(2));
  await row.getByLabel("밀도 단위").selectOption("g/mL");
  await row.getByRole("button", { name: "확인" }).click();
  await expect(row.getByText(/나누는 순서/)).toBeVisible();
  await expect(row.getByText(/틀렸|오답/)).toHaveCount(0);
  await solve(page, "큰 철조각");

  // 밀도는 그래프·예상과 결과 비교가 없다. 미션을 모두 마치기 전에는 보고서가 열리지 않는다
  await expect(page.getByRole("button", { name: /그래프 그리기/ })).toHaveCount(0);
  await expect(page.locator("section[aria-labelledby=after-title]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /보고서 쓰러 가기/ })).toHaveCount(0);
  for (const name of ["작은 철조각", "물", "식용유"]) await solve(page, name);
  const report = page.getByRole("button", { name: /보고서 쓰러 가기/ });
  await expect(report).toBeEnabled();

  // S6: 보고서 — 기록이 초안으로 옮겨지고, 해석·성찰은 비어 있으며, 체크리스트가 채워져야 제출 조건 충족
  await report.click();
  await expect(page.getByRole("heading", { name: /탐구 보고서/ })).toBeVisible();
  // 활동지 모양: 과정은 미션 순서대로 활동 1(액체)·2(금속)·3(한 비커), 자료 해석도 자료 1·2·3, 변인 칸은 없다 (ADR-P20)
  await expect(page.getByText("활동 3", { exact: true })).toBeVisible();
  await expect(page.locator("#r-act-1")).toHaveValue(/^➊ /);
  await expect(page.locator("#r-act-1")).toHaveValue(/식용유/);
  await expect(page.locator("#r-act-2")).toHaveValue(/철조각/);
  const results = page.getByRole("table", { name: /^자료 2 / });
  await expect(results.getByRole("row").filter({ hasText: "큰 철조각" })).toBeVisible();
  await expect(results.getByRole("columnheader", { name: "밀도(g/mL)" })).toBeVisible();
  await expect(page.getByText(/물이 식용유를 뚫고 아래로 가라앉았어요|아래부터 .*물 → 식용유/).first()).toBeVisible();
  await expect(page.locator("#r-var-i")).toHaveCount(0);
  await expect(page.locator("#r-evidence")).toHaveValue("");
  const gate = page.locator("section[aria-labelledby=submit-title]");
  await expect(gate.getByText(/아직: 정리 3: 성찰 질문 3개에 질문마다 10자 이상/)).toBeVisible();
  await expect(gate.getByText(/가설을 지지/)).toHaveCount(0);
  // 체크 항목은 누르는 칸이 아니라 저절로 바뀐다 — [쓰러 가기]로 그 칸에 옮겨 간다
  await expect(gate.getByText(/직접 누르는 칸이 아니에요/)).toBeVisible();
  await gate.getByRole("button", { name: /쓰러 가기/ }).first().click();
  await expect(page.locator("#r-evidence")).toBeFocused();
  await page.getByLabel("⭕ 내 예상이 맞았어요").check();
  await page.locator("#r-evidence").fill("표의 밀도 7.9 g/mL 두 값");
  await page.locator("#r-error").fill("눈금을 읽을 때 오차");
  await page.locator("#r-improve").fill("여러 번 재서 평균");
  for (const id of ["hardest", "curious", "realLife"]) await page.locator(`#r-ref-${id}`).fill("예상과 결과를 비교하며 생각한 점");
  await expect(gate.getByText(/완료: 정리 3: 성찰 질문 3개에 질문마다 10자 이상/)).toBeVisible();
  await expect(gate.getByRole("button", { name: "제출하기" })).toBeDisabled();
  await expect(gate.getByText(/체험 모드에서는 제출되지 않아요/)).toBeVisible();

  // 인쇄: 제목부터 학생이 쓴 글만 — 버튼·도움말·시작어·초안 표시·제출 칸은 보이지 않는다
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { name: /탐구 보고서/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /실험으로 돌아가기/ })).toBeHidden();
  await expect(page.getByRole("button", { name: /인쇄/ })).toBeHidden();
  await expect(page.getByRole("button", { name: /시작어 넣기/ }).first()).toBeHidden();
  await expect(page.getByText(/초안 · 실험 기록에서 옮겼어요/).first()).toBeHidden();
  await expect(gate).toBeHidden();
  await expect(page.locator("p:visible", { hasText: /^여러 번 재서 평균$/ })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "탐구 단계" })).toBeHidden();
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
  await predict(page, "식용유가 위로 간다");
  await expect(page.getByRole("alert").filter({ hasText: "전자저울 위에 용기가 없어요" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("g.lab-block-error")).toHaveCount(1);
});
