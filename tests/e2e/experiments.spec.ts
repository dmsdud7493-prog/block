/**
 * 실험 5종 정상 경로 (plan S8 수용 기준):
 * 설계(프로토타입 정답 순서 블록) → 예측 → 실행 → 측정값 표 → 그래프 전 예측 → 그래프 → 예상과 비교 → 보고서 초안.
 * 표에 보이는 측정값이 서버 simulate() 결과(/api/demo/run 응답)와 정확히 같은지 비교한다(골든 ↔ UI 일치).
 */
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { item, qty, workspace, type ActionSpec, type VarSpec } from "./workspace";
import { fmtNum } from "../../src/lib/engine/format";

interface Scenario { name: string; steps: string[][]; variables?: [string, string | null][]; expect: { ok: boolean } }

function slotBlock(slug: string, token: string) {
  const [kind, a, b] = token.split(":");
  if (kind === "E") return item(slug, a);
  if (kind === "Q") return qty(b, Number(a));
  return { block: { type: `pos_${slug}_${a}` } };
}

function scenario(slug: string): { ws: object; name: string } {
  const file = path.resolve(__dirname, "../../fixtures/prototypes", `${slug}.json`);
  const sc = (JSON.parse(fs.readFileSync(file, "utf8")) as { scenarios: Scenario[] }).scenarios.find((s) => s.expect.ok)!;
  const steps: ActionSpec[] = sc.steps.map(([action, ...slots]) => ({ action, inputs: slots.filter((t) => t !== "_").map((t) => slotBlock(slug, t)) }));
  const vars: VarSpec[] = (sc.variables ?? []).map(([role, option]) => ({ role, option: option ?? "", why: "공정하게 비교하려고" }));
  return { ws: workspace(slug, steps, vars), name: sc.name };
}

async function load(page: Page, state: object) {
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), state);
}

/** 열린 예측 창마다 첫 선택지 + 이유를 적어 저장한다. 곡선 그리기가 있으면 점 몇 개를 찍는다 */
async function answerGates(page: Page) {
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 4 && (await dialog.isVisible().catch(() => false)); i += 1) {
    const pad = dialog.getByRole("img", { name: /예상 그래프 그리기/ });
    if (await pad.count()) {
      const box = (await pad.boundingBox())!;
      for (const fx of [0.15, 0.5, 0.85]) await page.mouse.click(box.x + box.width * fx, box.y + box.height * (0.8 - fx / 2));
      await expect(pad).toHaveAttribute("aria-label", /3개 점/);
      const r = Number(await dialog.locator("[data-hit-radius]").first().getAttribute("data-hit-radius"));
      expect(r).toBeGreaterThanOrEqual(25);
    }
    await dialog.getByRole("radio").first().check();
    await dialog.getByLabel(/왜 그렇게 생각했나요/).fill("왜냐하면 배운 내용을 떠올려 보면");
    await dialog.getByRole("button", { name: "예상 저장하기" }).click();
    await page.waitForTimeout(300);
  }
}

for (const slug of ["melting", "boiling", "solubility", "separation1", "separation2"]) {
  test(`${slug}: 설계 → 예측 → 실행 → 표 → 그래프 → 보고서 초안`, async ({ page }) => {
    const { ws, name } = scenario(slug);
    test.info().annotations.push({ type: "scenario", description: name });
    await page.goto(`/demo/${slug}`);
    await load(page, ws);
    const runResponse = page.waitForResponse((r) => r.url().includes("/api/demo/run") && r.status() === 200);
    await page.getByRole("button", { name: /실험 실행하기/ }).click();
    await answerGates(page);
    const body = (await (await runResponse).json()) as { data: { ok: boolean; measurements: { value: number }[] } };
    expect(body.data.ok).toBe(true);

    const table = page.getByRole("table").filter({ hasText: "실험 1회차 결과" });
    await expect(table).toBeVisible({ timeout: 30_000 });
    const text = await table.innerText();
    for (const m of body.data.measurements) expect(text).toContain(fmtNum(m.value));

    await page.getByRole("button", { name: "📈 그래프 그리기" }).click();
    await answerGates(page);
    await expect(page.getByRole("figure", { name: /결과 그래프/ })).toBeVisible();

    for (const box of await page.locator("section[aria-labelledby=after-title] li").all()) {
      await box.getByRole("radio").first().check();
      await box.getByRole("textbox").fill("예상과 결과를 비교해 보니 이렇게 달랐다");
      await box.getByRole("button", { name: "저장" }).click();
    }
    await page.getByRole("button", { name: /보고서 쓰러 가기/ }).click();
    await expect(page.getByRole("heading", { name: /탐구 보고서/ })).toBeVisible();
    await expect(page.locator("#r-procedure")).toHaveValue(/1\. /);
    await expect(page.locator("#r-results")).not.toHaveValue("");
  });
}
