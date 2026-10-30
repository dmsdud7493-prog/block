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
  await expect(bar.getByRole("button", { name: "🗑 삭제" })).toBeDisabled();
  await page.locator('g[data-id="it1"] > .blocklyPath').first().click({ position: { x: 6, y: 20 }, force: true });
  await bar.getByRole("button", { name: "🗑 삭제" }).click();
  await expect(page.locator('g[data-id="it1"]')).toHaveCount(0);
  await expect(page.locator('g[data-id="ac1"]')).toHaveCount(1);

  await page.locator('g[data-id="ac1"] > .blocklyPath').first().click({ position: { x: 6, y: 20 }, force: true });
  await bar.getByRole("button", { name: "📋 복사" }).click();
  await bar.getByRole("button", { name: "📥 붙여넣기" }).click();
  await expect(page.locator(".blocklyBlockCanvas g.act_density_a4")).toHaveCount(2);
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

test("빈칸 속 준비물 옆 ⊗로 그 블록만 빼고, 다른 준비물을 끌어 넣는다 — 꾸러미 블록을 누르기만 하면 저절로 들어가지 않는다", async ({ page }) => {
  await loadDensity(page, { type: "act_density_a4", id: "ac1", inputs: { S0: { block: { type: "item_density_iron_big", id: "it1" } } } });
  await openEquip(page);
  await expect(page.locator(".blocklyFlyout g.item_density_iron_big image")).toHaveCount(0);
  const x = await boxOf(page, 'g[data-id="it1"] image');
  await page.mouse.click(x.x + x.w / 2, x.y + x.h / 2);
  await expect.poll(() => kids(page)).toEqual([]);

  // 행동 블록을 고른 채 꾸러미의 준비물을 눌러도 빈칸에 저절로 들어가지 않는다
  await page.locator('g[data-id="ac1"] > .blocklyPath').first().click({ position: { x: 6, y: 20 }, force: true });
  const big = await boxOf(page, "g.item_density_iron_big", true);
  await page.mouse.click(big.x + big.w / 2, big.y + big.h / 2);
  await page.waitForTimeout(300);
  await expect.poll(() => kids(page)).toEqual([]);

  // 끌어 넣기: 블록 가운데를 잡고 빈칸 위에 놓으면 들어간다
  const small = await boxOf(page, "g.item_density_iron_small", true);
  const s0 = await slotAt(page, "ac1", "S0");
  await drag(page, { x: small.x + small.w / 2, y: small.y + small.h / 2 }, { x: s0.x + small.w / 2, y: s0.y + small.h / 2 - 4 });
  await expect.poll(() => kids(page)).toEqual(["item_density_iron_small"]);
});

test("빈칸이 두 개인 행동 블록에서 뒤 빈칸부터 채워도 앞 빈칸에 끌어 넣을 수 있다", async ({ page }) => {
  await loadDensity(page, { type: "act_density_a7", id: "ac1" });
  await openEquip(page);
  const cyl = await boxOf(page, "g.item_density_cylinder", true);
  const s1 = await slotAt(page, "ac1", "S1");
  await drag(page, { x: cyl.x + cyl.w / 2, y: cyl.y + cyl.h / 2 }, { x: s1.x + cyl.w / 2, y: s1.y + cyl.h / 2 - 4 });
  await expect.poll(() => slotKids(page, "ac1")).toEqual({ S0: null, S1: "item_density_cylinder" });

  const iron = await boxOf(page, "g.item_density_iron_small", true);
  const s0 = await slotAt(page, "ac1", "S0");
  await drag(page, { x: iron.x + iron.w / 2, y: iron.y + iron.h / 2 }, { x: s0.x + iron.w / 2, y: s0.y + iron.h / 2 - 4 });
  await expect.poll(() => slotKids(page, "ac1")).toEqual({ S0: "item_density_iron_small", S1: "item_density_cylinder" });
});

/** 준비물 꾸러미를 연다 — 이미 열려 있으면 그대로(같은 단추를 다시 누르면 닫히므로) */
async function openEquip(page: import("@playwright/test").Page) {
  const open = await page.locator(".blocklyFlyout g.item_density_cylinder").first().isVisible().catch(() => false);
  if (!open) await page.locator(".cat-equip .blocklyToolboxCategory").click();
  await expect(page.locator(".blocklyFlyout g.item_density_cylinder").first()).toBeVisible();
}

async function loadDensity(page: import("@playwright/test").Page, action: object) {
  await page.goto("/demo/density");
  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((a) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad({
    blocks: { languageVersion: 0, blocks: [{ type: "proc_start", x: 24, y: 200, deletable: false, next: { block: a } }] },
  }), action);
}

type SlotFn = { __labSlot: (id: string, input: string) => { x: number; y: number } };
const slotAt = (page: import("@playwright/test").Page, id: string, input: string) =>
  page.evaluate(([i, n]) => (window as unknown as SlotFn).__labSlot(i, n), [id, input] as const);

/** 빈칸별로 끼워진 블록 종류 — 화면 순서가 아니라 S0·S1 자리로 확인한다 */
const slotKids = (page: import("@playwright/test").Page, id: string) => page.evaluate((bid) => {
  const xml = (window as unknown as { __labSave: () => { blocks: { blocks: Array<{ next?: { block: { id: string; inputs?: Record<string, { block: { type: string } }> } } }> } } }).__labSave();
  const act = xml.blocks.blocks[0].next!.block;
  void bid;
  return { S0: act.inputs?.S0?.block.type ?? null, S1: act.inputs?.S1?.block.type ?? null };
}, id);

/** proc_start 아래 행동 블록 종류를 위에서부터 차례로 */
const chainTypes = (page: import("@playwright/test").Page) => page.evaluate(() => {
  type B = { type: string; next?: { block: B } };
  const ws = (window as unknown as { __labSave: () => { blocks: { blocks: B[] } } }).__labSave();
  const start = ws.blocks.blocks.find((b) => b.type === "proc_start")!;
  const walk = (b: B | undefined): string[] => (b ? [b.type.replace("act_density_", ""), ...walk(b.next?.block)] : []);
  return walk(start.next?.block);
});

test("아래까지 복사한 묶음을 붙여넣으면 한 세트가 끝난 뒤 다음 세트가 이어진다", async ({ page }) => {
  await loadDensity(page, {
    type: "act_density_a4", id: "m1", inputs: { S0: { block: { type: "item_density_iron_big" } } },
    next: { block: { type: "act_density_a2", id: "p1", next: { block: { type: "act_density_a5", id: "c1" } } } },
  });
  const bar = page.getByRole("toolbar", { name: "블록 편집" });
  await page.locator('g[data-id="m1"] > .blocklyPath').first().click({ position: { x: 6, y: 12 }, force: true });
  await bar.getByRole("button", { name: /아래까지 복사/ }).click();
  await bar.getByRole("button", { name: "📥 붙여넣기" }).click();
  await expect.poll(() => chainTypes(page)).toEqual(["a4", "a2", "a5", "a4", "a2", "a5"]);
  await bar.getByRole("button", { name: "📥 붙여넣기" }).click();
  await expect.poll(() => chainTypes(page)).toEqual(["a4", "a2", "a5", "a4", "a2", "a5", "a4", "a2", "a5"]);
});
