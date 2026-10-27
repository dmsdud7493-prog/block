/** AI 튜터 패널 (체험 모드 = 규칙 기반) — 예측 전 결과 요구 시 예상을 먼저 묻는다 (지침 3.1·5.4) */
import { expect, test } from "@playwright/test";

test("튜터: 고지 문구, 제안 칩, 예측 전 정답 요구 보류", async ({ page }) => {
  await page.goto("/demo/density");
  const panel = page.getByRole("region", { name: "🤖 AI 실험 도우미" });
  await expect(panel.getByText(/AI 튜터예요/)).toBeVisible();
  await panel.getByLabel("도우미에게 물어보기").fill("밀도 답 알려줘");
  await panel.getByRole("button", { name: "보내기" }).click();
  const log = panel.getByRole("list", { name: "대화" });
  await expect(log.locator("li").last()).toContainText(/예상/);
  await panel.getByRole("button", { name: "막혔어요, 뭐부터 해야 해요?" }).click();
  await expect(log.locator("li")).toHaveCount(5);
});
