/**
 * 규칙 기반 튜터 — API 키가 없거나(체험 모드 기본) Claude 응답이 규칙을 어길 때 쓴다.
 * 같은 원칙: 정답 보류, 예측 먼저, 고칠 곳 하나만, 질문 하나 (지침 4.2·5.3·5.4).
 */
import type { TutorReply } from "./schemas";
import type { TutorState } from "./stateInjection";
import { ERROR_HINTS, type ErrorType } from "@/lib/engine/grader/errorTypes";
import { SAFETY_REPLY } from "./safety";

const ASKS_RESULT = /(결과|그래프|정답|답|몇|얼마|뜨|가라앉|녹는점|끓는점|밀도는)/;

const PHASE_QUESTION: Record<string, string> = {
  design: "이 실험에서 무엇을 바꾸고, 무엇을 재고, 무엇을 같게 할지 한 문장씩 말해 볼까요?",
  predict: "결과가 어떻게 될 것 같아요? 왜 그렇게 생각했는지도 한 줄 적어 볼까요?",
  run: "모니터에서 어느 단계가 가장 중요해 보였나요?",
  interpret: "표에서 가장 먼저 눈에 띄는 값은 무엇인가요? 예상과 비교해 볼까요?",
  report: "지금 쓰는 칸에서 가장 자신 없는 부분은 어디예요? 그 부분의 근거가 되는 표의 값을 찾아볼까요?",
};

const reply = (text: string, level: 0 | 1 | 2 | 3, action: TutorReply["next_action"], target = ""): TutorReply =>
  ({ reply: text, hint_level: level, next_action: action, target_ref: target, flag_teacher: false });

export function localTutor(state: TutorState, lastUser: string, risk: string | null): TutorReply {
  if (risk) return { ...reply(SAFETY_REPLY, 0, "none"), flag_teacher: true };
  if (!state.prediction_submitted && ASKS_RESULT.test(lastUser)) {
    return reply("결과를 보기 전에 먼저 예상해 보는 게 중요해요. 실행 버튼을 누르면 예상을 적는 칸이 나와요. 어떻게 될 것 같아요?", 0, "predict");
  }
  const wrong = state.check_results.find((c) => c.correct === false);
  if (wrong) {
    const hint = ERROR_HINTS[(wrong.error_type ?? "other") as ErrorType] ?? ERROR_HINTS.other;
    return reply(`'${wrong.label}' 칸을 같이 볼까요? ${hint}`, Math.min(1, state.hint_level_max) as 0 | 1, "enter_calc", wrong.label);
  }
  const err = state.check_panel.find((d) => d.severity === "error");
  if (err) {
    const text = state.hint_level_max >= 1 ? `점검 패널에 "${err.message}"라고 떠 있어요. 그 블록을 먼저 고쳐 볼까요?` : "점검 패널에 빨간 표시가 있어요. 어떤 블록에 표시가 있는지 찾아볼까요?";
    return reply(text, Math.min(1, state.hint_level_max) as 0 | 1, "edit_block");
  }
  if (state.changed_vars.length >= 2) {
    return reply(`이번 실행에서 바꾼 변인이 ${state.changed_vars.length}개(${state.changed_vars.join(", ")})예요. 결과가 달라진 게 어느 변인 때문인지 알 수 있을까요?`, 0, "ask_rationale");
  }
  if (lastUser.startsWith("(시스템 알림")) return reply("잠깐 멈춰 있네요. 지금 어디에서 고민하고 있는지 한 줄로 알려 줄래요?", 0, "none");
  return reply(PHASE_QUESTION[state.step] ?? PHASE_QUESTION.design, 0, "ask_rationale");
}
