/** 튜터 응답 강제 규칙 — 모의 모델(ai/test)로 검증 (ADR-P05) */
import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { respond, buildPrompt } from "@/lib/tutor/respond";
import { state } from "./helpers";

function model(outputs: object[]) {
  let i = 0;
  const calls: unknown[] = [];
  const m = new MockLanguageModelV4({
    doGenerate: async (opts) => {
      calls.push(opts);
      const out = outputs[Math.min(i, outputs.length - 1)];
      i += 1;
      return {
        content: [{ type: "text", text: JSON.stringify(out) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 100, noCache: 10, cacheRead: 90, cacheWrite: 0 }, outputTokens: { total: 20, text: 20, reasoning: undefined } },
        warnings: [],
      };
    },
  });
  return { m, calls };
}

const ok = { reply: "지금 무엇을 재려고 하는지 한 문장으로 말해 볼까요?", hint_level: 0, next_action: "ask_rationale", target_ref: "", flag_teacher: false };
const history = [{ role: "user" as const, content: "질량을 먼저 재야 할 것 같아요" }];

describe("respond()", () => {
  it("규칙을 지키면 Claude 응답 그대로 + 캐시 사용량 기록", async () => {
    const { m } = model([ok]);
    const r = await respond({ model: m, slug: "density", state: state(), history, expected: [], risk: null });
    expect(r.source).toBe("claude");
    expect(r.reply.reply).toBe(ok.reply);
    expect(r.usage?.cacheRead).toBe(90);
  });
  it("hint_level 상한을 넘으면 1회 교정 재요청 (지침 5.4)", async () => {
    const { m, calls } = model([{ ...ok, hint_level: 3 }, ok]);
    const r = await respond({ model: m, slug: "density", state: state({}, { hintLevelMax: 1 }), history, expected: [], risk: null });
    expect(calls).toHaveLength(2);
    expect(r.source).toBe("claude");
    expect(r.violations[0]).toContain("hint_level");
  });
  it("두 번 모두 정답 숫자를 말하면 규칙 기반 응답으로 대체", async () => {
    const leak = { ...ok, reply: "밀도는 7.9 g/mL예요!" };
    const { m } = model([leak, leak]);
    const r = await respond({ model: m, slug: "density", state: state(), history, expected: [7.9], risk: null });
    expect(r.source).toBe("local");
    expect(r.reply.reply).not.toContain("7.9");
  });
  it("위험 신호는 모델을 부르지 않고 고정 안내 + 교사 플래그", async () => {
    const { m, calls } = model([ok]);
    const r = await respond({ model: m, slug: "density", state: state(), history: [{ role: "user", content: "죽고 싶어" }], expected: [], risk: "self_harm" });
    expect(calls).toHaveLength(0);
    expect(r.reply.flag_teacher).toBe(true);
    expect(r.reply.reply).toContain("109");
    expect(r.reply.reply).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
  it("모델이 없으면(키 없음) 규칙 기반", async () => {
    const r = await respond({ model: null, slug: "density", state: state(), history, expected: [], risk: null });
    expect(r.source).toBe("local");
  });
  it("프롬프트 캐시: 공통 규칙·실험 메모 블록에 cacheControl, 상태 블록에는 없음 (D10)", () => {
    const { instructions: sys, messages } = buildPrompt("density", state(), history);
    expect(messages.every((x) => x.role !== "system")).toBe(true);
    expect(sys).toHaveLength(3);
    expect(sys[0].providerOptions?.anthropic).toEqual({ cacheControl: { type: "ephemeral" } });
    expect(sys[1].providerOptions?.anthropic).toEqual({ cacheControl: { type: "ephemeral" } });
    expect(sys[2].providerOptions).toBeUndefined();
    expect(String(sys[1].content)).toContain("영점조정");
  });
});
