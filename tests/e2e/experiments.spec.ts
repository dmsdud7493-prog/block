/**
 * 실험 5종 정상 경로 (plan S8 수용 기준):
 * 설계(프로토타입 정답 순서 블록) → 예측 → 실행 → 측정값 표 → 그래프 전 예측 → 그래프 → 예상과 비교 → (미션을 마치기 전이라) 보고서는 잠김.
 * 표에 보이는 측정값이 서버 simulate() 결과(/api/demo/run 응답)와 정확히 같은지 비교한다(골든 ↔ UI 일치).
 */
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { item, qty, workspace, type ActionSpec, type VarSpec } from "./workspace";
import { fmtMeasure } from "../../src/lib/engine/format";

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
  await page.waitForTimeout(500); // 블록 변경이 화면 상태에 반영될 때까지(200ms 디바운스)
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
    await dialog.getByRole("button", { name: /이 카드로 결정/ }).click();
    await page.waitForTimeout(300);
  }
}

const GRAPH_FOR_MISSIONS = ["melting", "boiling", "separation1"];

for (const slug of ["melting", "boiling", "solubility", "separation1", "separation2"]) {
  test(`${slug}: 설계 → 예측 → 실행 → 표 → (그래프) → 보고서 잠김(미션 전)`, async ({ page }) => {
    const { ws, name } = scenario(slug);
    test.info().annotations.push({ type: "scenario", description: name });
    await page.goto(`/demo/${slug}`);
    await load(page, ws);
    const runResponse = page.waitForResponse((r) => r.url().includes("/api/demo/run") && r.status() === 200);
    await page.getByRole("button", { name: /실험 실행하기/ }).click();
    await answerGates(page);
    const body = (await (await runResponse).json()) as { data: { ok: boolean; measurements: { value: number; digits?: number }[] } };
    expect(body.data.ok).toBe(true);

    const table = page.getByRole("table").filter({ hasText: "실험 1회차 결과" });
    await expect(table).toBeVisible({ timeout: 30_000 });
    const text = await table.innerText();
    for (const m of body.data.measurements) expect(text).toContain(fmtMeasure(m));

    // 그래프는 녹는점·끓는점·증류처럼 그래프에서 값을 읽는 실험만 미션 중에 열린다 — 용해도·재결정은 미션을 다 마친 뒤
    if (!GRAPH_FOR_MISSIONS.includes(slug)) {
      await expect(page.getByRole("button", { name: /그래프 그리기/ })).toHaveCount(0);
      await expect(page.getByText("🎯 오늘의 미션을 마치면 다음 단계가 열려요.")).toBeVisible();
      await expect(page.getByRole("button", { name: /보고서 쓰러 가기/ })).toHaveCount(0);
      return;
    }
    await page.getByRole("button", { name: "📈 그래프 그리기" }).click();
    await answerGates(page);
    await expect(page.getByRole("figure", { name: /결과 그래프/ })).toBeVisible();

    for (const box of await page.locator("section[aria-labelledby=after-title] li").all()) {
      await box.getByRole("radio").first().check();
      await box.getByRole("textbox").fill("예상과 결과를 비교해 보니 이렇게 달랐다");
      await box.getByRole("button", { name: "저장" }).click();
    }
    // 보고서는 오늘의 미션을 모두 마친 뒤 한 장으로 쓴다 — 계산값을 아직 안 맞혔으니 보고서 버튼 대신 미션 안내
    await expect(page.getByRole("button", { name: /보고서 쓰러 가기/ })).toHaveCount(0);
    await expect(page.getByText("🎯 오늘의 미션을 마치면 다음 단계가 열려요.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "탐구 단계" }).getByRole("button", { name: /보고서/ })).toBeDisabled();
    if (process.env.SHOTS) await page.locator("main").screenshot({ path: `/tmp/claude-0/ws-${slug}.png` });
  });
}
