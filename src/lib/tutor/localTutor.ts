/**
 * 규칙 기반 튜터(기본 도우미) — API 키가 없거나(체험 모드 기본) Claude 응답이 규칙을 어길 때 쓴다.
 * 같은 원칙: 정답 보류, 예측 먼저, 고칠 곳 하나만, 질문 하나 (지침 4.2·5.3·5.4).
 * 말투는 친절한 반말, 소크라테스식으로 묻고, 생각 없이 답하면 유머·되묻기로 집중을 돌리고,
 * 진짜로 막히면 힌트 사다리(점검 질문 → 개념 → 부분 답 → 다음 한 단계)로 돕는다(사용자 요청 2026-11-17).
 */
import type { TutorReply } from "./schemas";
import type { TutorState } from "./stateInjection";
import { ERROR_HINTS, type ErrorType } from "@/lib/engine/grader/errorTypes";
import { CATALOGS } from "@/lib/engine/experiments";
import { SAFETY_REPLY } from "./safety";
import { conceptOf } from "./glossary";
import { CHIP_REPLIES } from "./chips";
import { talkFor } from "./socratic";
import { toBanmal } from "./banmal";

const ASKS_RESULT = /(결과|그래프|정답|답|몇|얼마|뜨|가라앉|녹는점|끓는점|밀도는)/;

const PHASE_QUESTION: Record<string, string> = {
  design: "이 실험에서 무엇을 재야 미션을 풀 수 있을까? 하나만 먼저 말해 줘.",
  predict: "결과가 어떻게 될 것 같아? 왜 그렇게 생각했는지도 한 줄 적어 줄래?",
  run: "모니터에서 어느 단계가 제일 중요해 보였어?",
  interpret: "표에서 제일 먼저 눈에 띄는 값은 뭐야? 네 예상이랑 비교해 볼까?",
  report: "지금 쓰는 칸에서 제일 자신 없는 부분이 어디야? 그 근거가 되는 표의 값을 같이 찾아볼까?",
};

const reply = (text: string, level: 0 | 1 | 2 | 3, action: TutorReply["next_action"], target = ""): TutorReply =>
  ({ reply: text, hint_level: level, next_action: action, target_ref: target, flag_teacher: false });

const lv = (n: number) => Math.max(0, Math.min(3, n)) as 0 | 1 | 2 | 3;
const slugOf = (s: TutorState) => Object.values(CATALOGS).find((c) => c.title === s.unit)?.slug ?? null;
const pick = <T,>(xs: T[], n: number) => xs[Math.abs(n) % xs.length];

/** 생각 없이 보낸 말 — 유머 한마디 + 아주 쉬운 질문, 연달아면 둘 중 하나 고르기. 화면에 고칠 칸이 있으면 그 칸으로 데려온다 */
function refocus(s: TutorState): TutorReply {
  const t = talkFor(slugOf(s));
  const joke = pick(t.joke, s.off_task_streak + s.blocks_summary.length);
  const issue = screenIssue(s);
  if (issue) return { ...issue, reply: `${joke} ${issue.reply}` };
  const q = s.off_task_streak >= 2 ? t.choice : t.easy;
  return reply(`${joke} ${q}`, 0, "ask_rationale");
}

/** 진짜로 막혔을 때 — 허용된 힌트 단계만큼: 0 미션 되짚기, 1 개념, 2 부분 답(첫 블록), 3 다음 한 단계 */
function ladder(s: TutorState): TutorReply {
  const slug = slugOf(s);
  const t = talkFor(slug);
  const steps = slug ? CATALOGS[slug].exampleSteps : [];
  const level = lv(s.hint_level_max);
  const mission = s.mission ? `지금 미션은 「${s.mission}」이야. ` : "";
  if (level === 0) return reply(`막힐 수 있어, 괜찮아. ${mission}그걸 알아내려면 무엇을 재야 할까?`, 0, "edit_block");
  if (level === 1) return reply(`${mission}힌트 하나 줄게. ${t.concept}`, 1, "ask_rationale");
  if (level === 2 && steps[0]) return reply(`첫 블록만 알려 줄게. 「${steps[0]}」 이거야. 그다음엔 무엇을 해야 할 것 같아?`, 2, "edit_block");
  if (steps[1]) return reply(`다음 단계는 「${steps[1]}」${steps[2] ? `, 그다음은 「${steps[2]}」` : ""}야. 왜 이 순서인지 네 말로 한 줄만 설명해 줄래?`, 3, "edit_block");
  return reply(`${mission}${t.concept}`, lv(Math.min(level, 1)), "ask_rationale");
}

/** 계산 칸·블록 오류처럼 화면에 이미 드러난 문제 — 고칠 곳 하나만 */
function screenIssue(s: TutorState): TutorReply | null {
  const wrong = s.check_results.find((c) => c.correct === false);
  if (wrong) {
    const hint = ERROR_HINTS[(wrong.error_type ?? "other") as ErrorType] ?? ERROR_HINTS.other;
    return reply(`'${wrong.label}' 칸을 같이 볼까? ${toBanmal(hint)}`, lv(Math.min(1, s.hint_level_max)), "enter_calc", wrong.label);
  }
  const err = s.check_panel.find((d) => d.severity === "error");
  if (!err) return null;
  const text = s.hint_level_max >= 1 ? `점검 칸에 "${err.message}"라고 떠 있어. 그 블록부터 같이 고쳐 볼까?` : "점검 칸에 빨간 표시가 있네. 어느 블록에 표시가 있는지 찾아볼래?";
  return reply(text, lv(Math.min(1, s.hint_level_max)), "edit_block");
}

export function localTutor(state: TutorState, lastUser: string, risk: string | null): TutorReply {
  if (risk) return { ...reply(toBanmal(SAFETY_REPLY), 0, "none"), flag_teacher: true };
  const said = lastUser.trim();
  // "밀도가 뭐야?" 같은 개념 질문 — 낱말 뜻은 탐구 답이 아니므로 알려 주고, 되묻기로 학생에게 돌려준다(결과·결론은 말하지 않음, 지침 5.4)
  const concept = conceptOf(said);
  if (concept) return reply(toBanmal(`${concept.meaning} ${concept.ask}`), lv(Math.min(1, state.hint_level_max)), "ask_rationale");
  // 제안 칩 질문 — 블록에 고칠 곳이 있어도 물은 것에 먼저 답한다
  const chip = CHIP_REPLIES[said];
  if (chip?.afterPrediction && !state.prediction_submitted) return reply("좋은 질문이야! 근데 그건 결과랑 이어지는 거라, 먼저 결과를 예상해 보고 같이 알아보자. 실행 버튼을 누르면 예상을 적는 칸이 나와.", 0, "predict");
  if (chip) return reply(chip.text, lv(Math.min(1, state.hint_level_max)), "ask_rationale");
  if (state.off_task) return refocus(state);
  if (!state.prediction_submitted && ASKS_RESULT.test(said)) {
    return reply("결과를 보기 전에 먼저 예상해 보는 게 중요해. 실행 버튼을 누르면 예상을 적는 칸이 나와. 너는 어떻게 될 것 같아?", 0, "predict");
  }
  // 진짜로 막혔으면 지금 막힌 칸(틀린 계산 칸·점검 오류)부터, 없으면 힌트 사다리
  if (state.genuine_stuck || /뭐부터|막혔/.test(said)) return screenIssue(state) ?? ladder(state);
  const issue = screenIssue(state);
  if (issue) return issue;
  if (state.changed_vars.length >= 2) {
    return reply(`이번 실행에서 한꺼번에 바꾼 게 ${state.changed_vars.length}개(${state.changed_vars.join(", ")})야. 결과가 달라진 게 어느 걸 바꿔서인지 알 수 있을까?`, 0, "ask_rationale");
  }
  const missionAsk = state.mission ? `지금 미션은 「${state.mission}」이야. 그걸 알아내려면 무엇을 재야 할까?` : null;
  if (said.startsWith("(시스템 알림")) return reply(missionAsk ? `혹시 막혔어? ${missionAsk}` : "잠깐 멈춰 있네. 지금 어디서 고민하고 있는지 한 줄로 알려 줄래?", 0, "none");
  if (missionAsk && state.step === "design") return reply(missionAsk, 0, "edit_block");
  return reply(PHASE_QUESTION[state.step] ?? PHASE_QUESTION.design, 0, "ask_rationale");
}
