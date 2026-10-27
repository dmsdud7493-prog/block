/** 교사 영역 접근 가드 — 로그인하지 않으면 교사 화면 대신 로그인으로 보낸다 (Supabase 연결 E2E는 DEPLOY.md 스테이징 점검표) */
import { expect, test } from "@playwright/test";

for (const path of ["/dashboard", "/dashboard/classes/00000000-0000-4000-8000-000000000000/live", "/dashboard/submissions/00000000-0000-4000-8000-000000000000"]) {
  test(`비로그인 ${path} → /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  });
}

test("로그인 전 채점 API는 401", async ({ request }) => {
  const res = await request.post("/api/grade", { data: { submissionId: "00000000-0000-4000-8000-000000000000", action: "return", rubric: {}, feedback: "" } });
  expect(res.status()).toBe(401);
});
