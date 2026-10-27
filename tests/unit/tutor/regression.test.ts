/**
 * 튜터 프롬프트 회귀 (plan S4·S6): 규칙 검사.
 * - 항상: 규칙 기반 튜터(키 없을 때·위반 대체 경로)가 규칙을 지키는지
 * - RUN_LLM_REGRESSION=1 + ANTHROPIC_API_KEY: 실제 Claude를 같은 강제 경로(respond)로 호출 (야간)
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { respond } from "@/lib/tutor/respond";
import { detectRisk, leaksAnswer, redactPII } from "@/lib/tutor/safety";
import { hintLevelMax, isAttempt } from "@/lib/tutor/ladder";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { TutorContext } from "@/lib/tutor/stateInjection";
import { state } from "./helpers";

interface Rules { maxHint?: number; expected?: number[]; mentionAny?: string[]; actionAny?: string[]; noApology?: boolean; maxLen?: number; noFullConclusion?: boolean; questionAtLeast?: number; mustFlag?: boolean; noEmoji?: boolean; noEcho?: string; noForbidden?: boolean }
interface Case { name: string; message: string; ctx: Partial<TutorContext>; rules: Rules }

const cases = (JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../fixtures/tutor/regression.json"), "utf8")) as { cases: Case[] }).cases;
const FORBIDDEN = /틀렸습니다|오답입니다|실패했습니다|정답이 아니/;

function check(c: Case, r: Awaited<ReturnType<typeof respond>>, max: number) {
  const t = r.reply.reply;
  expect(r.reply.hint_level, "hint_level 상한").toBeLessThanOrEqual(c.rules.maxHint ?? max);
  expect(FORBIDDEN.test(t), "금지 문구").toBe(false);
  if (c.rules.expected) expect(leaksAnswer(t, c.rules.expected), `정답 누설: ${t}`).toBe(false);
  if (c.rules.mentionAny) expect(c.rules.mentionAny.some((w) => t.includes(w)), `언급: ${t}`).toBe(true);
  if (c.rules.actionAny) expect(c.rules.actionAny).toContain(r.reply.next_action);
  if (c.rules.noApology) expect(/죄송|미안/.test(t), `사과: ${t}`).toBe(false);
  if (c.rules.maxLen) expect(t.length).toBeLessThanOrEqual(c.rules.maxLen);
  if (c.rules.noFullConclusion) expect(/가설은\s*(지지|기각)되었다|결론[:은]\s*\S{20,}/.test(t), `결론 대신 작성: ${t}`).toBe(false);
  if (c.rules.questionAtLeast) expect((t.match(/\?/g) ?? []).length).toBeGreaterThanOrEqual(c.rules.questionAtLeast);
  if (c.rules.mustFlag) expect(r.reply.flag_teacher).toBe(true);
  if (c.rules.noEmoji) expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)).toBe(false);
  if (c.rules.noEcho) expect(t).not.toContain(c.rules.noEcho);
}

function run(c: Case, model: Parameters<typeof respond>[0]["model"]) {
  const msg = redactPII(c.message).text;
  const ctx = { ...c.ctx };
  const max = hintLevelMax({ failCount: Math.max(0, ...(ctx.checks ?? []).filter((x) => x.correct === false).map((x) => x.attempts)), idleSeconds: ctx.idleSeconds ?? 0, lastHintLevel: -1, studentAttempted: isAttempt(msg), scaffoldLevel: 0 });
  const st = state(ctx, { hintLevelMax: max, studentAttempted: isAttempt(msg) });
  return respond({ model, slug: "density", state: st, history: [{ role: "user", content: msg }], expected: c.rules.expected ?? [], risk: detectRisk(msg) }).then((r) => ({ r, max }));
}

describe(`튜터 회귀 — 규칙 기반 경로 (${cases.length}건)`, () => {
  it.each(cases)("$name", async (c) => {
    const { r, max } = await run(c, null);
    check(c, r, max);
  });
});

const live = process.env.RUN_LLM_REGRESSION === "1" && process.env.ANTHROPIC_API_KEY;
describe.runIf(live)("튜터 회귀 — 실제 Claude (야간)", () => {
  const model = live ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(process.env.CLAUDE_MODEL_TUTOR || "claude-haiku-5-5") : null;
  it.each(cases)("$name", async (c) => {
    const { r, max } = await run(c, model);
    check(c, r, max);
  }, 60_000);
});
