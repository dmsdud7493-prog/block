/** 오늘의 미션 — 무엇을 알아낼지 보여 주고, 마치면 ✅와 튜터 응원이 나온다 (밀도) */
import { expect, test } from "@playwright/test";
import { item, qty, workspace } from "./workspace";

const D = "density";

test("밀도: 미션 카드가 보이고, 넷을 한 비커에 넣으면 밀도 순서로 쌓인다 — 앞 미션 전에는 ③을 완료로 세지 않는다", async ({ page }) => {
  await page.goto(`/demo/${D}`);
  const card = page.getByRole("region", { name: "오늘의 미션" });
  await expect(card).toBeVisible();
  await expect(card.getByText("(지금 할 미션)")).toHaveCount(1);
  await expect(card.getByText(/물과 식용유, 누가 위로 갈까/)).toBeVisible();
  await expect(card.getByText("0/3")).toBeVisible();

  await page.waitForFunction(() => typeof (window as unknown as { __labLoad?: unknown }).__labLoad === "function");
  await page.evaluate((s) => (window as unknown as { __labLoad: (x: object) => void }).__labLoad(s), workspace(D, [
    { action: "a6", inputs: [item(D, "beaker"), item(D, "oil"), qty("mL", 50)] },
    { action: "a6", inputs: [item(D, "beaker"), item(D, "water"), qty("mL", 50)] },
    { action: "a7", inputs: [item(D, "iron_small"), item(D, "beaker")] },
    { action: "a7", inputs: [item(D, "iron_big"), item(D, "beaker")] },
  ]));
  await page.getByRole("button", { name: /실험 실행하기/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio").first().check();
  await dialog.getByLabel(/왜 그렇게 생각했나요/).fill("왜냐하면 무거운 게 가라앉으니까");
  await dialog.getByRole("button", { name: "예상 저장하기" }).click();

  await expect(page.getByRole("list", { name: "실험 기록" }).getByText(/아래부터 .*철조각 → 물 → 식용유/)).toBeVisible({ timeout: 20_000 });
  await expect(card.getByText("0/3")).toBeVisible();
  await expect(page.getByText(/미션 ③까지 모두 성공/)).toHaveCount(0);
  // ①은 아직이므로 지금 할 미션은 여전히 ①
  await expect(card.locator("li").first().getByText("(지금 할 미션)")).toHaveCount(1);
});
