import { expect, test } from "@playwright/test";

// 학생 입장 카드 QR(2026-11-20): 카메라 앱으로 찍은 주소로 들어오면 칸이 채워지고 주소창의 PIN은 지워진다
test("입장 카드 주소로 들어오면 반 코드·번호·PIN이 채워지고 주소에서 PIN이 사라진다", async ({ page }) => {
  await page.goto("/login#c=AB12CD&n=2701&p=123456");
  await expect(page.getByRole("status").filter({ hasText: "2701번 입장 카드를 읽었어요" })).toBeVisible();
  await expect(page.locator("[name=code]")).toHaveValue("AB12CD");
  await expect(page.locator("[name=no]")).toHaveValue("2701");
  await expect(page.locator("[name=pin]")).toHaveValue("123456");
  expect(page.url()).not.toContain("123456");
  await expect(page.locator("[name=ack]")).toBeFocused();
});

test("학생 입장 화면에 QR 찍기 단추가 있고, 닫으면 직접 입력할 수 있다", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "📷 입장 카드 QR 찍기" }).click();
  await expect(page.getByRole("dialog", { name: "📷 입장 카드 QR 찍기" })).toBeVisible();
  await page.getByRole("button", { name: "닫고 직접 입력하기" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[name=code]")).toBeEditable();
});
