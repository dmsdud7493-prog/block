/** 효과음 (사용자 요청 2026-11-17) — 소리 장치가 없는 환경(구형 브라우저·테스트)에서도 실험 재생을 막지 않는다 */
import { describe, expect, it } from "vitest";
import { playStep, stopAll } from "@/components/monitor/sound/labSound";
import type { Frame } from "@/lib/engine/types";

const frame = (type: string, state: object = {}): Frame => ({ stepIndex: 0, blockId: "b", event: { type, note: "" }, state } as unknown as Frame);

describe("효과음", () => {
  it.each(["pour", "zero", "dropSolid", "add", "repeat", "stir", "bath", "heat", "findBp", "measureUntil", "noop"])("%s 단계 소리를 내도 오류가 없다", (t) => {
    expect(() => playStep(frame(t, { heating: true, bubbles: 0.8, vapour: true }), 1, 1.6)).not.toThrow();
  });
  it("멈추기는 언제 불러도 안전하다", () => {
    expect(() => { stopAll(); stopAll(); }).not.toThrow();
    expect(() => playStep(null, 1, 1.6)).not.toThrow();
  });
});
