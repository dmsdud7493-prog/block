/** 랩메이트는 친절한 반말 (사용자 요청 2026-11-17) — 같이 쓰는 해요체 안내를 반말로 바꿔 말한다 */
import { describe, expect, it } from "vitest";
import { toBanmal } from "@/lib/tutor/banmal";
import { ERROR_HINTS } from "@/lib/engine/grader/errorTypes";
import { GLOSSARY } from "@/lib/tutor/glossary";
import { SAFETY_REPLY } from "@/lib/tutor/safety";

const POLITE = /(요[.?!]|요$|세요|습니다)/;

describe("toBanmal", () => {
  it.each(Object.entries(ERROR_HINTS))("오류 힌트 %s", (_k, t) => {
    expect(toBanmal(t)).not.toMatch(POLITE);
  });
  it.each(GLOSSARY.map((g) => [g.terms[0], g.meaning + " " + g.ask]))("개념 %s", (_k, t) => {
    expect(toBanmal(t)).not.toMatch(POLITE);
  });
  it("안전 안내", () => {
    expect(toBanmal(SAFETY_REPLY)).not.toMatch(POLITE);
  });
});

describe("칩 답도 반말", () => {
  it("CHIP_REPLIES", async () => {
    const { CHIP_REPLIES } = await import("@/lib/tutor/chips");
    for (const c of Object.values(CHIP_REPLIES)) expect(c.text).not.toMatch(/요[.?!]/);
  });
});
