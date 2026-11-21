/** 교사 화면 공용 타입 (클라이언트 허용) */
import type { StudentFold, SessionStatus } from "@/lib/events/fold";
import type { FourCards } from "@/lib/events/cards";
import type { CalcRequest, Diagnostic, Measurement, Program, Series } from "@/lib/engine/types";

export interface ClassSummary { id: string; name: string; joinCode: string; studentCount: number; settings: Record<string, unknown> }
export interface StudentRow { id: string; studentNo: string; consentOnFile: boolean; consentDate: string | null }
export interface AssignmentRow { id: string; slug: string; title: string; dueAt: string | null; allowLate: boolean; /** 넣는 양 정해 주기(ADR-P26) */ fixedAmounts?: boolean }

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
  /** 작성 중인 보고서(제출 전에도 교사가 읽기만 할 수 있다) */
  report: { content: Record<string, unknown>; aiAssisted: string[]; updatedAt: string } | null;
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
  /** 고쳐서 다시 낸 보고서에서 바뀐 칸(첫 제출이면 null) */
  changed: string[] | null;
  /** 서버에서 읽은 시각(실시간 표시용) */
  loadedAt?: number;
  history: { reason: string; at: string }[];
}

/** 반 보고서 모아 보기·인쇄 — 과제 하나에 제출된 보고서 모두(학번 순) */
export interface ClassReportItem {
  submissionId: string;
  studentNo: string;
  submittedAt: string;
  late: boolean;
  version: number;
  /** 🏁 채점 완료 / 돌려줌(고치는 중) / 채점 전 */
  state: "graded" | "returned" | "waiting";
  content: Record<string, unknown>;
  aiAssisted: string[];
  /** 학생에게 공개된 루브릭·코멘트(공개 전이면 비어 있음) */
  rubric: Record<string, string>;
  feedback: string;
}
export interface ClassReports { classId: string; className: string; assignments: AssignmentRow[]; assignment: AssignmentRow | null; items: ClassReportItem[]; notSubmitted: string[] }
