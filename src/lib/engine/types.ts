/**
 * 공통 엔진 타입 — 블록 DSL, 시뮬레이션 프레임, 진단, 측정값.
 * 브라우저·서버 공용(정답·물성 수치는 여기 두지 않는다 — ADR-P04).
 */
import type { GuidelineId } from "./guidelines";

export type Unit = "g" | "mL" | "cm" | "s" | "min" | "°C" | "개";

export type BlockCategory = "equip" | "quant" | "pos" | "variable" | "action";

/** 행동 블록 구멍에 끼운 값 */
export type SlotValue =
  | { kind: "equip"; id: string }
  | { kind: "quant"; value: number; unit: Unit }
  | { kind: "pos"; id: string };

export type SlotKind = SlotValue["kind"];

export interface SlotSpec {
  accepts: SlotKind;
  /** quant 슬롯의 허용 단위 (없으면 아무 단위) */
  units?: Unit[];
}

export interface ActionBlockDef {
  id: string;
  /** "(  )을(를) (  )에 올린 다음, 영점조정을 한다" — 구멍 위치는 "(  )" */
  text: string;
  slots: SlotSpec[];
  guideline?: GuidelineId[];
}

export interface ItemDef {
  id: string;
  label: string;
  icon: string;
  /** 반응·상태 판단에 쓰는 종류(수치 아님) */
  kind: string;
}

export interface QuantDef {
  unit: Unit;
  label: string;
}

export interface PosDef {
  id: string;
  label: string;
}

/** 절차 스택의 한 단계 */
export interface Step {
  blockId: string;
  action: string;
  slots: (SlotValue | null)[];
}

export type VariableRole = "independent" | "dependent" | "controlled";

/** 변인 설계 블록(지침 2.1) */
export interface VariableDecl {
  blockId: string;
  role: VariableRole | "experimental_group" | "comparison_group" | "method";
  /** 카탈로그 선택지 id (예: 'iron_size', 'water_volume') */
  optionId: string | null;
  /** 학생이 적은 선택 이유(지침 2.4) */
  rationale?: string;
}

export interface Program {
  experiment: string;
  variables: VariableDecl[];
  steps: Step[];
}

export type Severity = "error" | "warn" | "info";

export interface Diagnostic {
  blockId: string | null;
  severity: Severity;
  code: string;
  message: string;
  guideline: GuidelineId;
}

/** 학생에게 제시되는 측정값(지침: 측정값은 제시, 계산값은 학생 입력) */
export interface Measurement {
  key: string;
  trial: number;
  label: string;
  value: number;
  unit: Unit | "g/mL" | "g/물 100 g";
  subject: string;
}

/** 학생이 계산해서 입력해야 하는 칸 */
export interface CalcRequest {
  key: string;
  trial: number;
  label: string;
  unit: string;
  subject: string;
  /** 계산에 쓰는 측정값 키 (정답 공식은 서버 grader에만 있다) */
  inputs: string[];
}

export interface SeriesPoint {
  t: number;
  temp: number;
}

export interface Series {
  key: string;
  trial: number;
  subject: string;
  label: string;
  points: SeriesPoint[];
}

export interface SimEvent {
  type: string;
  note: string;
  [extra: string]: unknown;
}

export interface Frame<S = unknown> {
  stepIndex: number;
  blockId: string;
  event: SimEvent;
  state: S;
}

export interface StepOutcome<S> {
  state: S;
  event?: SimEvent;
  measurements?: Measurement[];
  calcRequests?: CalcRequest[];
  series?: Series[];
  error?: { code: string; message: string; guideline?: GuidelineId };
  /** 실행은 계속하되 학생이 알아야 할 점 (예: 식히지 않고 거르기 비교 시도) */
  warnings?: { code: string; message: string; guideline?: GuidelineId }[];
}

/** 학생에게 보여 주는 참고 자료 표(교과서 자료 — 정답 아님). 예: 온도별 용해도 표 */
export interface ReferenceTable {
  title: string;
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface SimulationResult<S = unknown> {
  ok: boolean;
  frames: Frame<S>[];
  diagnostics: Diagnostic[];
  measurements: Measurement[];
  calcRequests: CalcRequest[];
  series: Series[];
  /** 실행이 멈춘 단계(오류) */
  stoppedAt: number | null;
}
