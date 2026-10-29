/**
 * 실험 계획(변인 설계) 블록 6종 (지침 2.1). 각 블록은 실험 카탈로그의 variableOptions 중 하나를 고르고,
 * 선택 이유를 적을 수 있다(지침 2.4·5.2). 절차와의 일관성은 rules/variables.ts가 진단한다.
 */
import type { VariableDecl } from "../types";

export interface VariableBlockDef {
  id: string;
  role: VariableDecl["role"];
  /** 쉬운 말(과학 용어) — 카드 요약은 괄호 앞 쉬운 말만, 튜터에게는 둘 다 */
  label: string;
  /** 블록에 보이는 이모지 + 쉬운 말 */
  icon: string;
  easy: string;
  /** 교과서 용어 */
  term: string;
  help: string;
  color: string;
}

const def = (id: string, role: VariableDecl["role"], icon: string, easy: string, term: string, help: string, color: string): VariableBlockDef =>
  ({ id, role, icon, easy, term, label: `${easy}(${term})`, help: `${help} 과학에서는 '${term}'이라고 해요.`, color });

/** 변인이라는 말을 아직 모르는 학생도 알 수 있게 쉬운 말을 앞에, 교과서 용어를 괄호에 (사용자 피드백 2026-10-29) */
export const VARIABLE_BLOCKS: VariableBlockDef[] = [
  def("var_independent", "independent", "🔄", "바꿔 볼 것", "조작 변인", "일부러 다르게 해 보는 조건이에요.", "#7c3aed"),
  def("var_dependent", "dependent", "📏", "재서 비교할 것", "종속 변인", "바꾼 것 때문에 달라지는지 재 보는 값이에요.", "#2563eb"),
  def("var_controlled", "controlled", "⚖️", "똑같이 맞출 것", "통제 변인", "공정하게 비교하려고 모든 시도에서 똑같이 하는 조건이에요.", "#0f766e"),
  def("group_experimental", "experimental_group", "🅰️", "바꿔 본 쪽", "실험 집단", "조건을 바꿔 본 쪽이에요.", "#c2410c"),
  def("group_comparison", "comparison_group", "🅱️", "비교 기준 쪽", "비교 집단", "비교할 때 기준이 되는 쪽이에요.", "#a16207"),
  def("measure_method", "method", "🔍", "어떻게 잴지", "측정 방법", "재서 비교할 값을 어떤 도구로 어떻게 잴지 정해요.", "#475569"),
];

export function variableBlockByRole(role: VariableDecl["role"]): VariableBlockDef | undefined {
  return VARIABLE_BLOCKS.find((b) => b.role === role);
}
