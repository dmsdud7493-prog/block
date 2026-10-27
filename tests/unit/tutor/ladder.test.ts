import { describe, expect, it } from "vitest";
import { hintLevelMax, isAttempt, nextScaffoldLevel } from "@/lib/tutor/ladder";

const base = { failCount: 0, idleSeconds: 0, lastHintLevel: -1, studentAttempted: true, scaffoldLevel: 0 };

describe("힌트 사다리 (지침 4.1~4.4)", () => {
  it("첫 응답은 L0 점검 질문", () => expect(hintLevelMax(base)).toBe(0));
  it("학생이 시도하면 한 단계씩 오른다", () => {
    expect(hintLevelMax({ ...base, lastHintLevel: 0 })).toBe(1);
    expect(hintLevelMax({ ...base, lastHintLevel: 1 })).toBe(2);
    expect(hintLevelMax({ ...base, lastHintLevel: 2 })).toBe(3);
    expect(hintLevelMax({ ...base, lastHintLevel: 3 })).toBe(3);
  });
  it("시도 없이 다시 물으면 같은 레벨 (지침 4.2)", () => expect(hintLevelMax({ ...base, lastHintLevel: 1, studentAttempted: false })).toBe(1));
  it("2회 실패 또는 3분 정체면 L2까지 자동 하강 (지침 4.3)", () => {
    expect(hintLevelMax({ ...base, failCount: 2 })).toBe(2);
    expect(hintLevelMax({ ...base, idleSeconds: 180 })).toBe(2);
  });
  it("페이딩: scaffold_level ≥ 2인 학생은 2회 실패로는 아직 L0 (지침 4.4)", () => {
    expect(hintLevelMax({ ...base, failCount: 2, scaffoldLevel: 2 })).toBe(0);
    expect(hintLevelMax({ ...base, failCount: 3, scaffoldLevel: 2 })).toBe(2);
  });
  it("시도 판정", () => {
    expect(isAttempt("몰라 알려줘")).toBe(false);
    expect(isAttempt("답 알려줘요 제발요 빨리")).toBe(false);
    expect(isAttempt("질량을 부피로 나누면 될 것 같아요")).toBe(true);
    expect(isAttempt("7.9?")).toBe(true);
    expect(isAttempt("(시스템 알림: 2분 동안 조작이 없어요)")).toBe(false);
  });
  it("scaffold 다음 단계", () => {
    expect(nextScaffoldLevel(0, 0, true)).toBe(1);
    expect(nextScaffoldLevel(2, 2, true)).toBe(1);
    expect(nextScaffoldLevel(3, 0, true)).toBe(3);
  });
});
