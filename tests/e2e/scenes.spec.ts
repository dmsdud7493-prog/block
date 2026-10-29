/** 가상 실험 모니터 장면 캡처 (SHOTS=1일 때만) — 단계마다 모니터를 찍어 장치 그림을 눈으로 확인한다 */
import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { item, qty, workspace } from "./workspace";

test.skip(!process.env.SHOTS, "SHOTS=1 일 때만");

const OUT = process.env.SHOTS_DIR ?? "/tmp/claude-0/shots";

async function load(page: Page, state: object) {
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), state);
  // 손동작은 잠깐 나타났다 사라지므로 캡처할 때는 멈춰 둔다
  await page.addStyleTag({ content: ".lab-hand{animation:none!important}" });
  await page.waitForTimeout(400);
}

async function runAndCapture(page: Page, slug: string, frames: number) {
  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole("radio").first().check();
    await page.getByLabel(/왜 그렇게/).fill("왜냐하면 그럴 것 같아서");
    await page.getByRole("button", { name: "예상 저장하기" }).click();
  }
  const mon = page.locator("section[aria-labelledby=monitor-title] .monitor-screen");
  await mon.waitFor();
  for (let i = 0; i < frames; i += 1) {
    await page.waitForTimeout(i === 0 ? 900 : 1600);
    await mon.screenshot({ path: path.join(OUT, `scene-${slug}-${String(i).padStart(2, "0")}.png`) });
  }
}

test("density scenes", async ({ page }) => {
  const D = "density";
  const steps = (iron: string) => [
    { action: "a4", inputs: [item(D, iron)] },
    { action: "a2", inputs: [item(D, "water"), qty("mL", 50)] },
    { action: "a7", inputs: [item(D, iron), item(D, "cylinder")] },
    { action: "a8", inputs: [item(D, "cylinder")] },
    { action: "a5" },
  ];
  await page.goto(`/demo/${D}`);
  await load(page, workspace(D, [...steps("iron_big"), ...steps("iron_small")]));
  await runAndCapture(page, D, 10);
});

for (const slug of ["melting", "boiling", "solubility", "separation1", "separation2"]) {
  test(`${slug} scenes`, async ({ page }) => {
    test.setTimeout(120_000);
    const sc = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../fixtures/prototypes", `${slug}.json`), "utf8")).scenarios.find((s: { expect: { ok: boolean } }) => s.expect.ok);
    const tok = (t: string) => { const [k, a, b] = t.split(":"); return k === "E" ? item(slug, a) : k === "Q" ? qty(b, Number(a)) : { block: { type: `pos_${slug}_${a}` } }; };
    await page.goto(`/demo/${slug}`);
    await load(page, workspace(slug, sc.steps.map(([action, ...sl]: string[]) => ({ action, inputs: sl.map(tok) }))));
    await runAndCapture(page, slug, Math.min(14, sc.steps.length + 1));
  });
}
