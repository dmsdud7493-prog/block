/** 실험실 상태 리듀서 (순수 함수) — 지침 1.3·3.1·3.3·3.4 */
import type { CalcEntry, InquiryText, LabState, Phase, PredictionRecord, RunRecord } from "./types";
import type { Diagnostic, Program } from "@/lib/engine/types";

export type LabAction =
  | { type: "program"; program: Program; blockly: object; diagnostics: Diagnostic[] }
  | { type: "openGate"; target: string }
  | { type: "closeGate" }
  | { type: "hint"; target: string }
  | { type: "predicted"; record: PredictionRecord }
  | { type: "runStart" }
  | { type: "runDone"; run: RunRecord }
  | { type: "runFail"; message: string }
  | { type: "calc"; entry: CalcEntry }
  | { type: "after"; target: string; matched: boolean; text: string }
  | { type: "inquiry"; field: keyof InquiryText; value: string }
  | { type: "graph" }
  | { type: "phase"; phase: Phase }
  | { type: "hydrate"; state: Partial<LabState> };

export function initialLabState(slug: string, hydrate?: Partial<LabState>): LabState {
  return {
    phase: "design",
    program: { experiment: slug, steps: [], variables: [] },
    blockly: null,
    diagnostics: [],
    predictions: [],
    gateTarget: null,
    runs: [],
    running: false,
    runError: null,
    calc: {},
    inquiry: { problem: "", hypothesis: "" },
    graphOpened: false,
    programVersion: 0,
    ...hydrate,
  };
}

function upsertPrediction(list: PredictionRecord[], rec: PredictionRecord): PredictionRecord[] {
  return list.some((p) => p.target === rec.target)
    ? list.map((p) => (p.target === rec.target ? { ...p, ...rec } : p))
    : [...list, rec];
}

function hintPrediction(list: PredictionRecord[], target: string): PredictionRecord[] {
  const found = list.find((p) => p.target === target);
  const base: PredictionRecord = found ?? { target, choice: "", rationale: "", hintsUsed: 0 };
  return upsertPrediction(list, { ...base, hintsUsed: Math.min(3, base.hintsUsed + 1) });
}

export function labReducer(s: LabState, a: LabAction): LabState {
  switch (a.type) {
    case "program":
      return { ...s, program: a.program, blockly: a.blockly, diagnostics: a.diagnostics, programVersion: s.programVersion + 1, runError: null };
    case "openGate":
      return { ...s, gateTarget: a.target, phase: "predict" };
    case "closeGate":
      return { ...s, gateTarget: null, phase: s.runs.length > 0 ? "interpret" : "design" };
    case "hint":
      return { ...s, predictions: hintPrediction(s.predictions, a.target) };
    case "predicted":
      return { ...s, predictions: upsertPrediction(s.predictions, a.record), gateTarget: null, phase: s.runs.length > 0 ? "interpret" : "design" };
    case "runStart":
      return { ...s, running: true, runError: null, phase: "run" };
    case "runDone":
      return { ...s, running: false, runs: [...s.runs, a.run], phase: a.run.ok ? "interpret" : "design" };
    case "runFail":
      return { ...s, running: false, runError: a.message, phase: "design" };
    case "calc":
      return { ...s, calc: { ...s.calc, [a.entry.key]: a.entry } };
    case "after":
      return { ...s, predictions: s.predictions.map((p) => (p.target === a.target ? { ...p, matched: a.matched, rationaleAfter: a.text } : p)) };
    case "inquiry":
      return { ...s, inquiry: { ...s.inquiry, [a.field]: a.value } };
    case "graph":
      return { ...s, graphOpened: true };
    case "phase":
      return { ...s, phase: a.phase };
    case "hydrate":
      return { ...s, ...a.state };
    default:
      return s;
  }
}

/** 지침 3.1: 아직 예측하지 않은 대상 */
export function missingPrediction(s: LabState, targets: string[]): string | null {
  return targets.find((t) => !s.predictions.some((p) => p.target === t && p.choice)) ?? null;
}

/** 지침 3.3: 결과를 본 뒤 차이 설명을 모두 했는가 */
export function afterExplained(s: LabState): boolean {
  return s.predictions.length > 0 && s.predictions.every((p) => typeof p.matched === "boolean" && (p.rationaleAfter ?? "").trim().length >= 5);
}

export const latestRun = (s: LabState): RunRecord | null => (s.runs.length ? s.runs[s.runs.length - 1] : null);
