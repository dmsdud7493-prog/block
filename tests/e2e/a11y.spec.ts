/** 실제 렌더링된 페이지 접근성 (axe-core) — KWCAG 2.2 / WCAG 2.1 AA */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/", "/demo/density"]) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    await page.waitForTimeout(800);
    // Blockly 내부 SVG는 라이브러리 책임 영역이라 제외하고, 그 바깥 우리 UI를 검사한다
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude(".injectionDiv").analyze();
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`)).toEqual([]);
  });
}
