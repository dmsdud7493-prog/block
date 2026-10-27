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
