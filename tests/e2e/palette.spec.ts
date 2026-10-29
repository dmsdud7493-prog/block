/** 블록 꾸러미: 처음엔 펼쳐 있고, 같은 카테고리를 한 번 더 누르면 닫혀 조립판을 넓게 쓴다 */
import { expect, test } from "@playwright/test";

test("카테고리 단추를 다시 누르면 블록 꾸러미가 닫힌다", async ({ page }) => {
  await page.goto("/demo/separation1");
  const flyout = page.locator(".blocklyFlyout").first();
  await expect(flyout).toBeVisible();
  const action = page.locator(".cat-action .blocklyToolboxCategory");
  await action.click();
  await expect(flyout).toBeVisible();
  await action.click();
  await expect(flyout).toBeHidden();
  await expect(page.locator(".palette-closed")).toHaveCount(1);
  await action.click();
  await expect(flyout).toBeVisible();
});

test("잘못 끼운 준비물 블록을 빼고, 행동 블록을 복사·붙여넣기 한다", async ({ page }) => {
  await page.goto("/demo/density");
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate(() => (window as unknown as { __labLoad: (x: object) => void }).__labLoad({
    blocks: { languageVersion: 0, blocks: [
      { type: "design_start", x: 24, y: 24, deletable: false },
      { type: "proc_start", x: 24, y: 200, deletable: false, next: { block: { type: "act_density_a4", id: "ac1", inputs: { S0: { block: { type: "item_density_iron_big", id: "it1" } } } } } },
    ] },
  }));
  const bar = page.getByRole("toolbar", { name: "블록 편집" });
  await expect(bar.getByRole("button", { name: "🗑 빼기" })).toBeDisabled();
  await page.locator('g[data-id="it1"] > .blocklyPath').click({ position: { x: 6, y: 20 }, force: true });
  await bar.getByRole("button", { name: "🗑 빼기" }).click();
  await expect(page.locator('g[data-id="it1"]')).toHaveCount(0);
  await expect(page.locator('g[data-id="ac1"]')).toHaveCount(1);

  await page.locator('g[data-id="ac1"] > .blocklyPath').click({ position: { x: 6, y: 20 }, force: true });
  await bar.getByRole("button", { name: "📋 복사" }).click();
  await bar.getByRole("button", { name: "📥 붙여넣기" }).click();
  await expect(page.locator(".blocklyBlockCanvas g.act_density_a4")).toHaveCount(2);
  await expect(page.getByText("행동 블록 2개")).toBeVisible();
});
