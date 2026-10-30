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
    expect(localTutor(state({ mission: M }), "(시스템 알림: 2분)", null).reply).toContain("막혔어요?");
  });
  it("미션이 없으면 예전 질문 그대로", () => {
    expect(localTutor(state({}), "막혔어요, 뭐부터 해야 해요?", null).reply).not.toContain("미션");
  });
});
