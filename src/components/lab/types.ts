/** 실험실 화면 상태 타입 (클라이언트) */
import type { CalcRequest, Diagnostic, Frame, Measurement, Program, Series } from "@/lib/engine/types";
import type { ErrorType } from "@/lib/engine/grader/errorTypes";

export type Phase = "design" | "predict" | "run" | "interpret" | "report";

export const PHASES: { id: Phase; label: string }[] = [
  { id: "design", label: "설계" },
  { id: "predict", label: "예측" },
  { id: "run", label: "실험" },
  { id: "interpret", label: "결과 해석" },
  { id: "report", label: "보고서" },
];

export interface PredictionRecord {
  target: string;
  choice: string;
  rationale: string;
  hintsUsed: number;
  matched?: boolean | null;
  rationaleAfter?: string;
}

export interface RunRecord {
  runNo: number;
  ok: boolean;
  frames: Frame[];
  measurements: Measurement[];
  calcRequests: CalcRequest[];
  series: Series[];
  diagnostics: Diagnostic[];
  program: Program;
  changedVars: string[];
}

export interface CalcEntry {
  key: string;
  runNo: number;
  value: string;
  unit: string;
  attempts: number;
  correct: boolean | null;
  errorType: ErrorType | null;
  hint: string | null;
}

export interface InquiryText {
  problem: string;
  hypothesis: string;
}

export interface LabState {
  phase: Phase;
  program: Program;
  blockly: object | null;
  diagnostics: Diagnostic[];
  predictions: PredictionRecord[];
  gateTarget: string | null;
  runs: RunRecord[];
  running: boolean;
  runError: string | null;
  calc: Record<string, CalcEntry>;
  inquiry: InquiryText;
  graphOpened: boolean;
  programVersion: number;
}

/** 서버가 불러온 세션 화면 상태 (lib/server/hydrate.ts가 만든다) */
export interface SessionView {
  sessionId: string;
  slug: string;
  status: string;
  classSettings: Record<string, unknown>;
  hydrate: Partial<LabState>;
  blockly: object | null;
  report: { content: Record<string, unknown>; aiAssisted: string[]; version: number } | null;
  chat: { role: "user" | "assistant"; content: string; hintLevel?: number; source?: string; nudge?: boolean }[];
  submission: { rubric_scores: unknown; teacher_feedback: string | null; returned_at: string | null; submitted_at: string; late: boolean; version: number } | null;
}
