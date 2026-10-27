/** S9 컴플라이언스 화면 (R3·R5·R6·R13) */
import { expect, test } from "@playwright/test";

test("처리방침: 국외 이전 고지 항목과 열람 정책", async ({ page }) => {
  await page.goto("/privacy");
  for (const label of ["법적 근거", "이전받는 자", "이전 국가", "이전 항목", "이전 일시와 방법", "이용 목적과 보유 기간", "거부 방법과 거부 시 효과"]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  for (const who of ["Supabase", "Vercel", "Anthropic"]) await expect(page.getByRole("heading", { name: new RegExp(who) })).toBeVisible();
  await expect(page.getByText(/담당 선생님이 볼 수 있어요/)).toBeVisible();
});

test("로그인 화면에 AI 고지와 교사 열람 안내", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/사람이 아닌 AI/)).toBeVisible();
  await expect(page.getByText(/선생님이 볼 수 있어요/)).toBeVisible();
  await expect(page.getByRole("link", { name: "개인정보 처리방침" })).toBeVisible();
});

test("망 점검: 서버·블록 그림 파일 확인, 저장소 미설정은 해당 없음", async ({ page }) => {
  await page.goto("/netcheck");
  const list = page.getByRole("list").filter({ hasText: "가상 실험실 서버" });
  await expect(list.getByText(/가상 실험실 서버 — 정상/)).toBeVisible({ timeout: 15_000 });
  await expect(list.getByText(/블록 그림 파일 — 정상/)).toBeVisible();
  await expect(list.getByText(/저장소\(로그인·기록\) — 해당 없음/)).toBeVisible();
});

test("health API는 비밀 값을 돌려주지 않는다", async ({ request }) => {
  const body = await (await request.get("/api/health")).json();
  expect(body.ok).toBe(true);
  expect(JSON.stringify(body)).not.toMatch(/sk-|key|secret/i);
});
