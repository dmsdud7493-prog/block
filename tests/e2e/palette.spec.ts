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
