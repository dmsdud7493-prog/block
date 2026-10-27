/** 화면 확인용 스크린숏 (SHOTS=1일 때만) */
import { test } from "@playwright/test";
import { item, qty, workspace } from "./workspace";

test.skip(!process.env.SHOTS, "SHOTS=1 일 때만");

test("density screens", async ({ page }) => {
  const D = "density";
  const steps = (iron: string) => [
    { action: "a4", inputs: [item(D, iron)] },
    { action: "a2", inputs: [item(D, "water"), qty("mL", 50)] },
    { action: "a7", inputs: [item(D, iron), item(D, "cylinder")] },
    { action: "a8", inputs: [item(D, "cylinder")] },
    { action: "a5" },
  ];
  await page.goto("/demo/density");
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s),
    workspace(D, [...steps("iron_big"), ...steps("iron_small")], [{ role: "independent", option: "iron_size" }, { role: "controlled", option: "liquid_volume" }]));
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  await page.getByRole("button", { name: /힌트 1/ }).click();
  await page.screenshot({ path: "/tmp/claude-0/shots/gate.png" });
  await page.getByLabel("두 철조각의 밀도는 같다").check();
  await page.getByLabel(/왜 그렇게/).fill("같은 철이니까 같을 것 같다");
  await page.getByRole("button", { name: "예상 저장하기" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/claude-0/shots/run.png", fullPage: true });
});

test("S8 scenes", async ({ page }) => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  for (const slug of ["melting", "boiling", "solubility", "separation1", "separation2"]) {
    const sc = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../fixtures/prototypes", `${slug}.json`), "utf8")).scenarios.find((s: { expect: { ok: boolean } }) => s.expect.ok);
    const tok = (t: string) => { const [k, a, b] = t.split(":"); return k === "E" ? item(slug, a) : k === "Q" ? qty(b, Number(a)) : { block: { type: `pos_${slug}_${a}` } }; };
    await page.goto(`/demo/${slug}`);
    await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
    await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), workspace(slug, sc.steps.map(([action, ...sl]: string[]) => ({ action, inputs: sl.map(tok) }))));
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /실험 실행하기/ }).click();
    const pad = page.getByRole("img", { name: /예상 그래프 그리기/ });
    if (await pad.count()) {
      const box = (await pad.boundingBox())!;
      for (const fx of [0.05, 0.3, 0.5, 0.7, 0.95]) await page.mouse.click(box.x + box.width * fx, box.y + box.height * (0.85 - fx * 0.6));
      await page.screenshot({ path: `/tmp/claude-0/shots/${slug}-sketch.png` });
    }
    await page.getByRole("dialog").getByRole("radio").first().check();
    await page.getByLabel(/왜 그렇게/).fill("왜냐하면 그럴 것 같아서");
    await page.getByRole("button", { name: "예상 저장하기" }).click();
    await page.waitForTimeout(1800);
    await page.locator("section[aria-labelledby=monitor-title]").screenshot({ path: `/tmp/claude-0/shots/${slug}-monitor.png` });
    await page.waitForTimeout(6000);
    await page.getByRole("button", { name: "📈 그래프 그리기" }).click();
    for (let i = 0; i < 3 && await page.getByRole("dialog").isVisible().catch(() => false); i += 1) {
      await page.getByRole("dialog").getByRole("radio").first().check();
      await page.getByLabel(/왜 그렇게/).fill("왜냐하면 그럴 것 같아서");
      await page.getByRole("button", { name: "예상 저장하기" }).click();
      await page.waitForTimeout(300);
    }
    const fig = page.getByRole("figure", { name: /결과 그래프/ });
    const shade = page.getByRole("button", { name: /평평한 구간 표시하기/ });
    if (await shade.count()) await shade.click();
    await fig.screenshot({ path: `/tmp/claude-0/shots/${slug}-graph.png` });
  }
});
