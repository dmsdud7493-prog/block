/** 교사 화면 공용 타입 (클라이언트 허용) */
import type { StudentFold, SessionStatus } from "@/lib/events/fold";
import type { FourCards } from "@/lib/events/cards";
import type { CalcRequest, Diagnostic, Measurement, Program, Series } from "@/lib/engine/types";

export interface ClassSummary { id: string; name: string; joinCode: string; studentCount: number; settings: Record<string, unknown> }
export interface StudentRow { id: string; studentNo: string; consentOnFile: boolean; consentDate: string | null }
export interface AssignmentRow { id: string; slug: string; title: string; dueAt: string | null; allowLate: boolean }

export interface ClassBoard {
  classId: string;
  className: string;
  assignments: AssignmentRow[];
  assignment: AssignmentRow | null;
  folds: StudentFold[];
  cards: FourCards;
  submissionIdOf: Record<string, string>;
  generatedAt: number;
}

export interface RunLine { run_no: number; ok: boolean; program: Program; measurements: Measurement[]; calc_requests: CalcRequest[]; series: Series[]; diagnostics: Diagnostic[]; changed_vars: string[]; created_at: string }
export interface ChatLine { role: "user" | "assistant"; content: string; flagged: boolean; created_at: string }

export interface SessionDetail {
  sessionId: string;
  classId: string;
  studentNo: string;
  slug: string;
  title: string;
  status: SessionStatus;
  currentStep: string;
  startedAt: string;
  submissionId: string | null;
  program: Program | null;
  runs: RunLine[];
  calc: { key: string; value: number | null; unit: string | null; is_correct: boolean; error_type: string | null; attempt: number; created_at: string }[];
  predictions: { target: string; choice: string; rationale: string; matched: boolean | null; rationale_after: string | null; hints_used: number }[];
  chat: ChatLine[];
}

export interface SubmissionDetail {
  submissionId: string;
  sessionId: string;
  classId: string;
  studentNo: string;
  slug: string;
  title: string;
  status: SessionStatus;
  submittedAt: string;
  late: boolean;
  version: number;
  returnedAt: string | null;
  content: Record<string, unknown>;
  aiAssisted: string[];
  rubric: Record<string, string>;
  feedback: string;
  draft: { rubric: Record<string, string>; feedback: string; updatedAt: string } | null;
  history: { reason: string; at: string }[];
}
