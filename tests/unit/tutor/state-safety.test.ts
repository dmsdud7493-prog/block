import { describe, expect, it } from "vitest";
import { detectRisk, leaksAnswer, redactPII } from "@/lib/tutor/safety";
import { stateBlock } from "@/lib/tutor/stateInjection";
import { state } from "./helpers";

describe("상태 주입 (지침 5.1, R4)", () => {
  it("블록을 문장으로 요약하고 변인·근거를 담는다", () => {
    const s = state();
    expect(s.blocks_summary).toEqual(["눈금실린더를 전자저울에 올린 다음, 영점조정을 한다"]);
    expect(s.variables[0]).toContain("철조각의 크기");
    expect(s.variables[0]).toContain("크기만 바꾸려고");
    expect(s.predictions_pending).toEqual(["same_density", "float_sink"]);
  });
  it("이름·학교·정답 관련 키가 없다", () => {
    const text = stateBlock(state());
    expect(text).not.toMatch(/display_?name|school|학교|answers|expected|7\.9/);
  });
});

describe("안전 (R7·R8)", () => {
  it("위험 신호 감지", () => {
    expect(detectRisk("요즘 죽고 싶어요")).toBe("self_harm");
    expect(detectRisk("친구가 괴롭혀요")).toBe("violence_bullying");
    expect(detectRisk("밀도가 뭐예요?")).toBeNull();
  });
  it("개인정보 가림", () => {
    expect(redactPII("내 번호 010-1234-5678이야").text).toBe("내 번호 [개인정보 가림]이야");
    expect(redactPII("abc@school.kr 로 보내줘").redacted).toBe(true);
    expect(redactPII("질량 79 g").redacted).toBe(false);
  });
  it("정답 누설 검사: 기대값과 같은 숫자", () => {
    expect(leaksAnswer("밀도는 7.9 g/mL이에요", [7.9])).toBe(true);
    expect(leaksAnswer("밀도는 약 7.92예요", [7.9])).toBe(true);
    expect(leaksAnswer("1단계부터 다시 볼까요? 2개 블록을 확인해요", [1.0])).toBe(false);
    expect(leaksAnswer("물의 밀도는 1.0 g/mL", [1.0])).toBe(true);
    expect(leaksAnswer("질량 79.0 g을 부피 10.0 mL로 나눠 보세요", [7.9])).toBe(false);
  });
});
