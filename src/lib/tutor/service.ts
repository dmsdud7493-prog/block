/**
 * /api/tutor 서비스 (server-only): 맥락 조립 → respond() → (세션이면) 대화 저장·플래그·페이딩
 */
import "server-only";
import { getCatalog } from "@/lib/engine/experiments";
import type { CalcRequest } from "@/lib/engine/types";
import type { TutorInput } from "@/lib/server/schemas";
import { privateExpected, runProgram } from "@/lib/server/simulation";
import { rpc, rpcRow, normalizeError } from "@/lib/server/rpc";
import { sessionForUser } from "@/lib/server/sessions";
import { hintLevelMax, isAttempt } from "./ladder";
import { detectRisk, redactPII } from "./safety";
import { buildState } from "./stateInjection";
import { respond, type ChatTurn } from "./respond";
import { tutorModel } from "./model";
import type { TutorResponse } from "./schemas";

interface Ctx { tone: "haeyo" | "banmal"; scaffold: number; lastHint: number; nudges: number; seed: string | null }

async function sessionCtx(userId: string, input: TutorInput): Promise<Ctx> {
  const s = await sessionForUser(input.sessionId as string);
  if (s.studentId !== userId) throw new Error("forbidden");
  const t = await rpcRow<{ tone: string; scaffold_level: number; last_hint_level: number; nudge_count: number }>("app_tutor_context", { p_student: userId, p_session: s.id });
  return { tone: t.tone === "banmal" ? "banmal" : "haeyo", scaffold: t.scaffold_level, lastHint: t.last_hint_level, nudges: t.nudge_count, seed: s.seed };
}

/** 아직 맞히지 않은 계산 칸의 기대값 — 누설 검사에만 쓰고 응답·상태에는 넣지 않는다 */
function expectedValues(input: TutorInput, seed: string | null): number[] {
  if (!seed || !input.runNo) return [];
  const solved = new Set(input.context.checks.filter((c) => c.correct).map((c) => c.key));
  const requests: CalcRequest[] = runProgram(input.slug, input.program, seed, input.runNo).calcRequests;
  return requests.filter((r) => !solved.has(r.key))
    .map((r) => privateExpected({ slug: input.slug, program: input.program, seed, runNo: input.runNo as number, key: r.key }))
    .filter((v): v is number => v !== null);
}

function cleanHistory(messages: TutorInput["messages"]): { history: ChatTurn[]; redacted: boolean } {
  const out = messages.map((m) => (m.role === "user" ? { ...m, ...redactPII(m.content) } : { ...m, redacted: false }));
  return { history: out.map(({ role, content }) => ({ role, content })), redacted: out.some((m) => m.redacted) };
}

export async function tutorTurn(input: TutorInput, userId: string | null): Promise<TutorResponse & { redacted: boolean }> {
  try {
    const catalog = getCatalog(input.slug);
    if (!catalog) throw new Error("not_found");
    const ctx: Ctx = input.mode === "session" && userId ? await sessionCtx(userId, input) : { tone: "haeyo", scaffold: 0, lastHint: input.context.lastHintLevel, nudges: 0, seed: input.seed ?? null };
    const { history, redacted } = cleanHistory(input.messages);
    const lastUser = history[history.length - 1]?.content ?? "";
    const attempted = isAttempt(lastUser);
    const failCount = Math.max(0, ...input.context.checks.filter((c) => c.correct === false).map((c) => c.attempts));
    const max = hintLevelMax({ failCount, idleSeconds: input.context.idleSeconds, lastHintLevel: ctx.lastHint, studentAttempted: attempted, scaffoldLevel: ctx.scaffold });
    const state = buildState({ catalog, program: input.program, ctx: { ...input.context, nudgeSent: input.context.nudgeSent || ctx.nudges > 0 }, tone: ctx.tone, scaffoldLevel: ctx.scaffold, hintLevelMax: max, studentAttempted: attempted, failCount });
    const risk = detectRisk(lastUser);
    const result = await respond({ model: tutorModel(input.mode), slug: input.slug, state, history, expected: expectedValues(input, ctx.seed), risk });
    const flagged = Boolean(risk) || result.reply.flag_teacher;
    if (input.mode === "session" && userId) await persist(userId, input, lastUser, result, flagged, risk);
    return { ...result.reply, source: result.source, flagged, redacted };
  } catch (e) {
    throw normalizeError(e);
  }
}

async function persist(userId: string, input: TutorInput, lastUser: string, result: Awaited<ReturnType<typeof respond>>, flagged: boolean, risk: string | null) {
  const sid = input.sessionId as string;
  if (!input.nudge) await rpc("app_add_chat", { p_student: userId, p_session: sid, p_role: "user", p_content: redactPII(lastUser).text, p_meta: { risk }, p_flagged: Boolean(risk) });
  const meta = { hint_level: result.reply.hint_level, source: result.source, usage: result.usage, violations: result.violations, nudge: Boolean(input.nudge), risk, next_action: result.reply.next_action };
  await rpc("app_add_chat", { p_student: userId, p_session: sid, p_role: "assistant", p_content: result.reply.reply, p_meta: meta, p_flagged: flagged && !risk });
}
