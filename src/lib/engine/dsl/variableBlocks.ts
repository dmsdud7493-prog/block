/**
 * 변인 설계 블록 6종 (지침 2.1). 각 블록은 실험 카탈로그의 variableOptions 중 하나를 고르고,
 * 선택 이유를 적을 수 있다(지침 2.4·5.2). 절차와의 일관성은 rules/variables.ts가 진단한다.
 */
import type { VariableDecl } from "../types";

export interface VariableBlockDef {
  id: string;
  role: VariableDecl["role"];
  label: string;
  help: string;
  color: string;
}

export const VARIABLE_BLOCKS: VariableBlockDef[] = [
  { id: "var_independent", role: "independent", label: "조작 변인(바꾸는 것)", help: "실험에서 일부러 다르게 하는 조건", color: "#7c3aed" },
  { id: "var_dependent", role: "dependent", label: "종속 변인(측정하는 것)", help: "조작 변인 때문에 달라지는지 재는 값", color: "#2563eb" },
  { id: "var_controlled", role: "controlled", label: "통제 변인(같게 하는 것)", help: "공정한 비교를 위해 모든 시도에서 같게 하는 조건", color: "#0f766e" },
  { id: "group_experimental", role: "experimental_group", label: "실험 집단", help: "조건을 바꾼 쪽", color: "#c2410c" },
  { id: "group_comparison", role: "comparison_group", label: "비교 집단", help: "비교 기준이 되는 쪽", color: "#a16207" },
  { id: "measure_method", role: "method", label: "측정 방법", help: "종속 변인을 무엇으로 어떻게 잴지", color: "#475569" },
];

export function variableBlockByRole(role: VariableDecl["role"]): VariableBlockDef | undefined {
  return VARIABLE_BLOCKS.find((b) => b.role === role);
}
