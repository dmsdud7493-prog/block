/** 반 전체 PIN 재발급(2026-11-20) — 교사 소유 반만, 번호 순, 한 명이 실패해도 나머지는 계속 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const updates: string[] = [];
let failId = "";
const cls = { join_code: "AB12CD", teacher_id: "t1" };
const enrolls = [
  { student_id: "s10", student_no: "2710" },
  { student_id: "s2", student_no: "2702" },
  { student_id: "s1", student_no: "2701" },
];

function table(name: string) {
  const q = {
    select: () => q,
    eq: () => (name === "enrollments" ? Promise.resolve({ data: enrolls, error: null }) : q),
    single: () => Promise.resolve({ data: cls, error: null }),
  };
  return q;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: table,
    auth: { admin: { updateUserById: async (id: string) => { updates.push(id); return { error: id === failId ? { message: "x" } : null }; } } },
  }),
}));

import { resetClassPins } from "@/lib/server/students";

beforeEach(() => {
  updates.length = 0;
  failId = "";
});

describe("resetClassPins", () => {
  it("다른 교사의 반이면 거절하고 아무 PIN도 바꾸지 않는다", async () => {
    await expect(resetClassPins("someone-else", "c1")).rejects.toThrow("forbidden");
    expect(updates).toEqual([]);
  });

  it("번호 순으로 모든 학생에게 새 6자리 PIN을 준다", async () => {
    const rows = await resetClassPins("t1", "c1");
    expect(rows.map((r) => r.studentNo)).toEqual(["2701", "2702", "2710"]);
    expect(rows.every((r) => /^\d{6}$/.test(r.pin ?? ""))).toBe(true);
    expect(updates).toEqual(["s1", "s2", "s10"]);
  });

  it("한 명이 실패해도 나머지는 재발급하고, 실패한 학생은 PIN 없이 알린다", async () => {
    failId = "s2";
    const rows = await resetClassPins("t1", "c1");
    expect(rows.find((r) => r.studentNo === "2702")).toMatchObject({ pin: null });
    expect(rows.find((r) => r.studentNo === "2702")?.error).toContain("다시 재발급");
    expect(rows.filter((r) => r.pin).length).toBe(2);
  });
});
