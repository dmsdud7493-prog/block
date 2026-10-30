/**
 * 실험 정의 계약 — 카탈로그(클라이언트 허용)와 물성(server-only)을 분리한다 (ADR-P04).
 * 리듀서는 숫자를 ctx.param()/ctx.noise()로만 얻으므로, dryRun에서는 NaN 스텁으로 같은 규칙을 돌린다.
 */
import type {
  ActionBlockDef, ItemDef, PosDef, QuantDef, ReferenceTable, Step, StepOutcome, VariableRole,
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

/**
 * 예측(POE)은 형성평가다: 점수 없음, 재시도·수정 가능, 정답 비공개(결과를 보고 스스로 비교) — CLAUDE.md 규칙 1, 지침 3.1·3.3.
 */
export const PREDICTION_ASSESSMENT = { type: "FORMATIVE", maxAttempts: null, showAnswerAfter: "NEVER" } as const;

/**
 * 곡선 예측 그리기 (지침 3.1 곡선 예측, plan S8). 축 범위는 넓게 잡아 정답 위치를 암시하지 않는다.
 * points개의 시점(0 ~ xMax 초, 같은 간격)마다 학생이 온도를 하나씩 찍는다.
 */
export interface SketchSpec {
  xMax: number;
  yMin: number;
  yMax: number;
  points: number;
}

export interface PredictionTarget {
  id: string;
  question: string;
  choices: PredictionChoice[];
  /** 예측 힌트 P1~P3 (정답 미포함) — 지침 4.2 */
  hints: [string, string, string];
  /** 있으면 선택지 외에 시간–온도 곡선을 직접 그려 볼 수 있다(선택) */
  sketch?: SketchSpec;
}

/**
 * 오늘의 미션 — 무엇을 알아낼지만 알려 주고, 순서는 학생이 블록으로 짠다(규칙 6: 설계를 대신 만들지 않음).
 * 완료 조건은 선언형: solved = 계산값을 맞힌 대상(subject) 모두, event = 실행 기록에 이 종류의 이벤트가 있고 그 settled에 items가 모두 있음.
 */
export interface MissionDef {
  id: string;
  icon: string;
  title: string;
  /** 미션을 마쳤을 때 튜터가 건네는 한마디(정답 수치는 넣지 않는다) */
  cheer: string;
  done: { solved?: string[]; event?: { type?: string; settled: string[] } };
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
  /** 학생이 계산에 쓰는 공개 참고 자료(교과서 표) */
  reference?: ReferenceTable[];
  /** 오늘의 미션(순서대로 열린다). 없으면 미션 카드를 보이지 않는다 */
  missions?: MissionDef[];
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
