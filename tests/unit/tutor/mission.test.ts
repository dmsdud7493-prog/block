/** 기본 도우미: 오늘의 미션이 있으면 막혔을 때·설계 단계에서 미션을 짚어 주되 순서는 알려 주지 않는다 */
import { describe, expect, it } from "vitest";
import { localTutor } from "@/lib/tutor/localTutor";
import { state } from "./helpers";

const M = "물과 식용유, 누가 위로 갈까? 둘의 밀도를 구해 봐";

describe("localTutor + 미션", () => {
  it("'뭐부터 해야 해요?'에 지금 미션을 짚고 질문으로 돌려준다", () => {
    const r = localTutor(state({ mission: M }), "막혔어요, 뭐부터 해야 해요?", null);
    expect(r.reply).toContain(M);
    expect(r.reply).toMatch(/\?$/);
  });
  it("오래 멈추면(시스템 알림) 미션으로 슬쩍 밀어 준다", () => {
    expect(localTutor(state({ mission: M }), "(시스템 알림: 2분)", null).reply).toContain("막혔어?");
  });
  it("미션이 없으면 예전 질문 그대로", () => {
    expect(localTutor(state({}), "막혔어요, 뭐부터 해야 해요?", null).reply).not.toContain("미션");
  });
});

describe("소크라테스식·집중 돌리기 (사용자 요청 2026-11-17)", () => {
  const off = (streak: number) => state({ mission: M }, {}) && { ...state({ mission: M }), off_task: true, off_task_streak: streak };
  it("'몰라'·의미 없는 글자에는 유머 한마디 + 쉬운 질문(반말)", () => {
    const r = localTutor(off(0), "몰라", null);
    expect(r.reply).toMatch(/\?$/);
    expect(r.reply).not.toMatch(/요[.?!]/);
    expect(r.reply).toContain("부피는 어떤 도구");
  });
  it("연달아 딴짓하면 둘 중 하나 고르기로 더 쉽게", () => {
    expect(localTutor(off(2), "ㅋㅋㅋ", null).reply).toContain("둘 중 하나만 골라 봐");
  });
  it("진짜로 막히면 힌트 사다리 — 0 미션 → 1 개념 → 2 첫 블록(부분 답) → 3 다음 단계", () => {
    const at = (max: number) => localTutor({ ...state({ mission: M }, { hintLevelMax: max }), genuine_stuck: true }, "모르겠어 어떻게 해?", null);
    expect(at(0).reply).toContain("무엇을 재야");
    expect(at(1).reply).toContain("질량을 부피로 나눠");
    expect(at(2).reply).toContain("「눈금실린더를 전자저울에 올린 다음, 영점조정을 한다」");
    expect(at(3).reply).toContain("「물을 50mL만큼 눈금실린더에 붓는다」");
    expect([0, 1, 2, 3].map((m) => at(m).hint_level)).toEqual([0, 1, 2, 3]);
  });
  it("6개 실험 모두 집중 돌리기·개념 힌트 문장이 있고 반말이다", async () => {
    const { LAB_TALK } = await import("@/lib/tutor/socratic");
    expect(Object.keys(LAB_TALK).sort()).toEqual(["boiling", "density", "melting", "separation1", "separation2", "solubility"]);
    for (const t of Object.values(LAB_TALK)) expect([t.easy, t.choice, t.concept, ...t.joke].join(" ")).not.toMatch(/요[.?!]/);
  });
});
