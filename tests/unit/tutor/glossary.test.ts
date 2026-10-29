/** 기본 도우미 개념 질문 — 뜻은 알려 주되 결과·결론은 말하지 않는다 (지침 4.1·5.4) */
import { describe, expect, it } from "vitest";
import { conceptOf, GLOSSARY } from "@/lib/tutor/glossary";
import { localTutor } from "@/lib/tutor/localTutor";
import { state } from "./helpers";

describe("conceptOf", () => {
  it.each(["밀도가 뭐야?", "밀도가 뭐예요", "용해도 뜻 알려줘", "증류란?", "통제 변인이 뭐지"])("%s → 개념", (q) => {
    expect(conceptOf(q)).not.toBeNull();
  });
  it("더 구체적인 용어를 고른다", () => {
    expect(conceptOf("통제 변인이 뭐야?")?.terms).toContain("통제 변인");
  });
  it("결과를 묻는 질문은 개념 질문이 아니다", () => {
    expect(conceptOf("밀도는 얼마예요?")).toBeNull();
    expect(conceptOf("결과 알려 줘")).toBeNull();
    expect(conceptOf("밀도 답 알려줘")).toBeNull();
  });
  it("사전 문장에 실험 결론을 담지 않는다", () => {
    const all = GLOSSARY.map((g) => g.meaning + g.ask).join(" ");
    expect(all).not.toMatch(/크기와 (관계|상관)없이|온도가 (일정|변하지 않)|에탄올이 먼저|물이 먼저/);
  });
});

describe("localTutor 개념 질문", () => {
  it("밀도가 뭐야? → 뜻 + 되묻기, 힌트 1단계", () => {
    const r = localTutor(state(), "밀도가 뭐야?", null);
    expect(r.reply).toContain("질량을 부피로 나눈");
    expect(r.reply).toMatch(/\?$/);
    expect(r.hint_level).toBe(1);
  });
  it("힌트 상한이 0이어도 낱말 뜻은 알려 주고, 힌트 단계는 상한을 넘지 않는다", () => {
    const r = localTutor(state({}, { hintLevelMax: 0 }), "밀도가 뭐야?", null);
    expect(r.hint_level).toBe(0);
    expect(r.reply).toContain("나눈");
  });
});
