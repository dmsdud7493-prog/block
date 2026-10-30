/** 키보드만으로 블록 추가 (plan S2 수용 기준, KWCAG 키보드 접근) — Blockly 13 내장 키보드 탐색 */
import { expect, test, type Page } from "@playwright/test";

const mainBlocks = (page: Page) => page.evaluate(() => document.querySelectorAll("svg.blocklySvg > g.blocklyWorkspace > g.blocklyBlockCanvas > g").length);

test("키보드로 도구 상자에서 블록을 꺼내 작업 공간에 놓는다", async ({ page }) => {
  await page.goto("/demo/density");
  await expect(page.locator(".blocklyToolbox")).toBeVisible();
  const before = await mainBlocks(page);
  // 실제 사용자처럼 Tab으로 도구 상자까지 이동
  for (let i = 0; i < 20; i += 1) {
    const cls = await page.evaluate(() => document.activeElement?.getAttribute("class") ?? "");
    if (cls.includes("blocklyToolboxCategoryContainer")) break;
    await page.keyboard.press("Tab");
  }
  // 밀도는 '오늘의 미션'이 있어 실험 계획 꾸러미가 없으므로 첫 꾸러미가 준비물
  await expect(page.locator(".blocklyToolboxCategoryContainer.blocklyActiveFocus")).toContainText("준비물");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect.poll(() => mainBlocks(page)).toBeGreaterThan(before);
});
