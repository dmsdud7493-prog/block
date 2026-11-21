/** 교사 대시보드·반 관리의 반 순서(2026-11-21) — 만든 순서가 아니라 반 이름 순 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { sortClasses } from "@/lib/server/teacher";

describe("sortClasses", () => {
  it("2-7을 먼저 만들었어도 2-1이 앞에, 2-10은 2-9 뒤에 온다", () => {
    const names = ["2-7", "2-1", "2-10", "2-9", "1-3"].map((name) => ({ name }));
    expect(sortClasses(names).map((c) => c.name)).toEqual(["1-3", "2-1", "2-7", "2-9", "2-10"]);
  });
});
