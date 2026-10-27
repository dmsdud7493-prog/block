/**
 * 실험 정의 계약 — 카탈로그(클라이언트 허용)와 물성(server-only)을 분리한다 (ADR-P04).
 * 리듀서는 숫자를 ctx.param()/ctx.noise()로만 얻으므로, dryRun에서는 NaN 스텁으로 같은 규칙을 돌린다.
 */
import type {
  ActionBlockDef, ItemDef, PosDef, QuantDef, Step, StepOutcome, VariableRole,
} from "../types";

export interface NoiseSpec {
  /** 절댓값 노이즈 폭 (±) */
  abs?: number;
  /** 상대 노이즈 폭 (±비율) */
  rel?: number;
  /** 눈금 해상도 — 결과를 이 단위로 반올림 */
  resolution?: number;
}

export interface ReduceContext {
  /** 서버 물성 파라미터 (dryRun에서는 NaN) */
  param: (key: string) => number;
  /** 측정 노이즈 적용 (seed 기반) */
  noise: (value: number, spec: NoiseSpec) => number;
  /** 현재 시도 번호 (1부터) */
  trial: number;
  stepIndex: number;
}

export interface VariableOption {
  id: string;
  label: string;
  roles: (VariableRole | "group" | "method")[];
  /** 한 시도(trial)의 단계들에서 이 변인의 값을 뽑는다 — 통제/조작 일관성 검사(지침 1.2, 2.3) */
  extract?: (trialSteps: Step[]) => string | number | null;
}

export interface PredictionChoice {
  id: string;
  label: string;
}

export interface PredictionTarget {
  id: string;
  question: string;
  choices: PredictionChoice[];
  /** 예측 힌트 P1~P3 (정답 미포함) — 지침 4.2 */
  hints: [string, string, string];
}

export interface ExperimentCatalog<S> {
  slug: string;
  title: string;
  standards: string[];
  goal: string;
  scene: string;
  items: ItemDef[];
  quants: QuantDef[];
  positions: PosDef[];
  actions: ActionBlockDef[];
  variableOptions: VariableOption[];
  exampleSteps: string[];
  predictionTargets: PredictionTarget[];
  /** 이 목록의 대상(subject)을 모두 측정하면 실험 완료 */
  requiredSubjects: string[];
  initialState: () => S;
  reduce: (state: S, step: Step, ctx: ReduceContext) => StepOutcome<S> & { endTrial?: boolean };
  /** 시도 경계 블록 — 이 블록 다음부터 새 시도 */
  isTrialEnd: (step: Step) => boolean;
}

/** 아무 상태 타입의 카탈로그를 담기 위한 형 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 레지스트리는 실험별 상태 타입을 지운다
export type AnyCatalog = ExperimentCatalog<any>;
