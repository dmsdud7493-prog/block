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
  await page.locator('g[data-id="it1"] > .blocklyPath').first().click({ position: { x: 6, y: 20 }, force: true });
  await bar.getByRole("button", { name: "🗑 빼기" }).click();
  await expect(page.locator('g[data-id="it1"]')).toHaveCount(0);
  await expect(page.locator('g[data-id="ac1"]')).toHaveCount(1);

  await page.locator('g[data-id="ac1"] > .blocklyPath').first().click({ position: { x: 6, y: 20 }, force: true });
  await bar.getByRole("button", { name: "📋 복사" }).click();
  await bar.getByRole("button", { name: "📥 붙여넣기" }).click();
  await expect(page.locator(".blocklyBlockCanvas g.act_density_a4")).toHaveCount(2);
  await expect(page.getByText("행동 블록 2개")).toBeVisible();
});

/** 실제 마우스 끌기 — Blockly는 프레임마다 위치를 읽으므로 조금씩 옮긴다 */
async function drag(page: import("@playwright/test").Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 25; i += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 25, from.y + ((to.y - from.y) * i) / 25);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
}

const boxOf = (page: import("@playwright/test").Page, sel: string, inFlyout = false) => page.evaluate(([s, f]) => {
  const g = [...document.querySelectorAll(s as string)].find((x) => Boolean(x.closest(".blocklyFlyout")) === f);
  const r = g!.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
}, [sel, inFlyout] as const);

const kids = (page: import("@playwright/test").Page) => page.evaluate(() => [...document.querySelectorAll('g[data-id="ac1"] g[class*="item_density"]')].map((k) => k.getAttribute("class")!.split(" ")[0]));

test("빈칸 속 준비물만 ✕로 빼고, 다른 준비물을 끌어 넣거나 눌러서 넣는다", async ({ page }) => {
  await page.goto("/demo/density");
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate(() => (window as unknown as { __labLoad: (x: object) => void }).__labLoad({
    blocks: { languageVersion: 0, blocks: [
      { type: "proc_start", x: 24, y: 200, deletable: false, next: { block: { type: "act_density_a4", id: "ac1", inputs: { S0: { block: { type: "item_density_iron_big", id: "it1" } } } } } },
    ] },
  }));
  await page.locator(".cat-equip .blocklyToolboxCategory").click();
  const it = await boxOf(page, 'g[data-id="it1"]');
  await page.mouse.click(it.x + 6, it.y + it.h / 2);
  await page.getByRole("button", { name: "빈칸에서 이 블록 빼기" }).click();
  await expect.poll(() => kids(page)).toEqual([]);

  // 끌어 넣기: 빈칸 근처에만 놓아도 들어간다
  const ac = await boxOf(page, 'g[data-id="ac1"]');
  const small = await boxOf(page, "g.item_density_iron_small", true);
  await drag(page, { x: small.x + 6, y: small.y + small.h / 2 }, { x: ac.x + 28, y: ac.y + ac.h / 2 + 8 });
  await expect.poll(() => kids(page)).toEqual(["item_density_iron_small"]);

  // 눌러서 바꾸기: 빈칸 속 블록을 고르고 꾸러미의 다른 준비물을 누른다
  const s2 = await boxOf(page, 'g[data-id="ac1"] g.item_density_iron_small');
  await page.mouse.click(s2.x + 6, s2.y + s2.h / 2);
  const big = await boxOf(page, "g.item_density_iron_big", true);
  await page.mouse.click(big.x + 6, big.y + big.h / 2);

  await expect.poll(() => kids(page)).toEqual(["item_density_iron_big"]);
});
