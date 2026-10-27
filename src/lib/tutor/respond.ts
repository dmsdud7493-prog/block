/**
 * 튜터 응답 생성 (server-only) — Claude 호출 + 규칙 강제 (ADR-P05).
 * 1) 캐시 블록: 공통 규칙 / 실험 메모+수업 자료  2) 비캐시: <상태>  3) 대화 기록(최근 24턴)
 * 응답이 hint_level 상한을 넘거나 정답 숫자를 담으면 1회 교정 재요청, 그래도 어기면 규칙 기반 응답으로 대체.
 */
import "server-only";
import { generateText, Output, type LanguageModel, type ModelMessage, type SystemModelMessage } from "ai";
import { tutorReplySchema, type TutorReply } from "./schemas";
import { leaksAnswer } from "./safety";
import { localTutor } from "./localTutor";
import { stateBlock, type TutorState } from "./stateInjection";
import { TUTOR_RULES } from "./prompts/common";
import { KNOWLEDGE_BASE } from "./prompts/knowledgeBase";
import { experimentNotes } from "./prompts";

export interface ChatTurn { role: "user" | "assistant"; content: string }

export interface RespondArgs {
  model: LanguageModel | null;
  slug: string;
  state: TutorState;
  history: ChatTurn[];
  expected: number[];
  risk: string | null;
}

export interface RespondResult {
  reply: TutorReply;
  source: "claude" | "local";
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
  violations: string[];
}

const CACHE = { anthropic: { cacheControl: { type: "ephemeral" as const } } };

/** AI SDK v7: 시스템 프롬프트는 instructions로 (블록마다 캐시 지정 가능) */
export function buildPrompt(slug: string, state: TutorState, history: ChatTurn[], correction?: string): { instructions: SystemModelMessage[]; messages: ModelMessage[] } {
  const notes = `<실험>\n${state.unit} — 학습 목표: ${state.goal}\n${experimentNotes(slug)}\n</실험>\n<참고_자료>\n${KNOWLEDGE_BASE}\n</참고_자료>`;
  const instructions: SystemModelMessage[] = [
    { role: "system", content: TUTOR_RULES, providerOptions: CACHE },
    { role: "system", content: notes, providerOptions: CACHE },
    { role: "system", content: stateBlock(state) + (correction ? `\n<교정>\n${correction}\n</교정>` : "") },
  ];
  return { instructions, messages: history.slice(-24).map((t) => ({ role: t.role, content: t.content }) as ModelMessage) };
}

function violationsOf(r: TutorReply, state: TutorState, expected: number[]): string[] {
  return [
    r.hint_level > state.hint_level_max ? `hint_level ${r.hint_level} > 허용 ${state.hint_level_max}` : null,
    leaksAnswer(r.reply, expected) ? "학생이 계산해야 할 값을 말함" : null,
  ].filter((x): x is string => x !== null);
}

async function callOnce(args: RespondArgs, correction?: string) {
  const res = await generateText({
    model: args.model as LanguageModel,
    output: Output.object({ schema: tutorReplySchema }),
    ...buildPrompt(args.slug, args.state, args.history, correction),
    maxOutputTokens: 700,
    temperature: 0.3,
    abortSignal: AbortSignal.timeout(25_000),
  });
  const u = res.usage;
  const usage = { input: u.inputTokens ?? 0, output: u.outputTokens ?? 0, cacheRead: u.inputTokenDetails?.cacheReadTokens ?? 0, cacheWrite: u.inputTokenDetails?.cacheWriteTokens ?? 0 };
  return { reply: res.output as TutorReply, usage };
}

export async function respond(args: RespondArgs): Promise<RespondResult> {
  const lastUser = [...args.history].reverse().find((t) => t.role === "user")?.content ?? "";
  const local = (violations: string[]): RespondResult => ({ reply: localTutor(args.state, lastUser, args.risk), source: "local", usage: null, violations });
  if (!args.model || args.risk) return local([]);
  try {
    const first = await callOnce(args);
    const v1 = violationsOf(first.reply, args.state, args.expected);
    if (v1.length === 0) return { reply: first.reply, source: "claude", usage: first.usage, violations: [] };
    const second = await callOnce(args, `직전 응답이 규칙을 어겼어요: ${v1.join(", ")}. hint_level은 ${args.state.hint_level_max} 이하, 정답 숫자 없이 다시 답해요.`);
    const v2 = violationsOf(second.reply, args.state, args.expected);
    return v2.length === 0 ? { reply: second.reply, source: "claude", usage: second.usage, violations: v1 } : local([...v1, ...v2]);
  } catch {
    return local(["claude_unavailable"]);
  }
}
