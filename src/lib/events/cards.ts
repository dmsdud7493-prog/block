/**
 * 교사 대시보드 4카드 (D11, plan T-03): 막힌 학생 / 미제출·지각 / 플래그된 AI 대화 / 공통 오답 상위 3.
 * 카드마다 "다음 행동"을 한 줄로 준다 — 교사 업무를 늘리지 않기 위해 (plan §8.1).
 */
import type { EventRow } from "./types";
import type { StudentFold } from "./fold";

export interface RosterEntry { studentId: string; studentNo: string }

export interface StuckCard { students: { sessionId: string; studentNo: string; reasons: string[]; nextAction: string | null }[] }

export interface SubmissionCard {
  notStarted: string[];
  inProgress: number;
  overdue: { sessionId: string; studentNo: string }[];
  toGrade: { sessionId: string; studentNo: string; late: boolean; resubmitted: boolean }[];
  returned: number;
}

export interface FlagCard { items: { sessionId: string; studentNo: string; kind: string; ts: string }[] }

export interface CommonError { key: string; label: string; count: number; students: number }

export interface FourCards { stuck: StuckCard; submission: SubmissionCard; flags: FlagCard; errors: CommonError[] }

/** 계산값 오류 유형의 교사용 짧은 이름 (학생 안내 문구와 별개) */
export const ERROR_TYPE_LABEL: Record<string, string> = {
  swapped: "나누는 순서를 바꿈 (부피÷질량)",
  unit: "단위 선택 오류",
  meniscus: "눈금(메니스커스) 읽기 오류",
  decimal: "소수점 자리 오류",
  rounding: "반올림·계산 실수",
  solvent_basis: "물 100 g 기준 환산 누락",
  plateau: "그래프의 평평한 구간을 못 찾음",
  table_read: "용해도 표 읽기 오류",
  not_number: "숫자가 아닌 입력",
  other: "기타 계산 오류",
};

const RISK_LABEL: Record<string, string> = { self_harm: "자해·위기 신호", violence_bullying: "폭력·괴롭힘", model: "AI가 교사 확인 요청" };

export function stuckCard(folds: StudentFold[]): StuckCard {
  const students = folds
    .filter((f) => f.stuck.length > 0)
    .sort((a, b) => b.stuck.length - a.stuck.length || b.dwellSec - a.dwellSec)
    .map((f) => ({ sessionId: f.sessionId, studentNo: f.studentNo, reasons: f.stuck.map((r) => r.text), nextAction: f.nextAction }));
  return { students };
}

export function submissionCard(folds: StudentFold[], roster: RosterEntry[], now: number): SubmissionCard {
  const started = new Set(folds.map((f) => f.studentId));
  const open = folds.filter((f) => f.status === "in_progress" || f.status === "returned");
  const waiting = folds.filter((f) => (f.status === "submitted" || f.status === "resubmitted") && (!f.returnedAt || (f.submittedAt ?? "") > f.returnedAt));
  return {
    notStarted: roster.filter((r) => !started.has(r.studentId)).map((r) => r.studentNo),
    inProgress: open.length,
    overdue: open.filter((f) => f.dueAt && Date.parse(f.dueAt) < now).map((f) => ({ sessionId: f.sessionId, studentNo: f.studentNo })),
    toGrade: waiting.map((f) => ({ sessionId: f.sessionId, studentNo: f.studentNo, late: f.late, resubmitted: f.status === "resubmitted" })),
    returned: folds.filter((f) => f.status === "returned").length,
  };
}

export function flagCard(events: EventRow[], studentNoOf: (sessionId: string) => string): FlagCard {
  const items = events
    .filter((e) => e.event_type === "ai_flagged")
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .map((e) => ({ sessionId: e.session_id, studentNo: studentNoOf(e.session_id), kind: RISK_LABEL[String(e.payload.kind)] ?? "AI가 교사 확인 요청", ts: e.ts }));
  return { items };
}

function errorKey(e: EventRow): { key: string; label: string } | null {
  if (e.event_type === "calc_checked" && e.payload.correct === false) {
    const t = String(e.payload.errorType ?? "other");
    return { key: `calc:${t}`, label: ERROR_TYPE_LABEL[t] ?? t };
  }
  const codes = e.payload.codes;
  if (e.event_type === "sim_error_flagged" && Array.isArray(codes) && codes.length > 0) {
    return { key: `sim:${String(codes[0])}`, label: typeof e.payload.message === "string" ? `실행 오류: ${e.payload.message}` : `실행 오류 (${String(codes[0])})` };
  }
  return null;
}

/** 공통 오답 상위 n — 학생 수가 많은 순, 같으면 횟수 순 */
export function commonErrors(events: EventRow[], n = 3): CommonError[] {
  const tally = new Map<string, { label: string; count: number; students: Set<string> }>();
  events.forEach((e) => {
    const k = errorKey(e);
    if (!k) return;
    const cur = tally.get(k.key) ?? { label: k.label, count: 0, students: new Set<string>() };
    tally.set(k.key, { label: cur.label, count: cur.count + 1, students: cur.students.add(e.student_id) });
  });
  return [...tally.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count, students: v.students.size }))
    .sort((a, b) => b.students - a.students || b.count - a.count)
    .slice(0, n);
}

export function fourCards(folds: StudentFold[], events: EventRow[], roster: RosterEntry[], now: number): FourCards {
  const noOf = new Map(folds.map((f) => [f.sessionId, f.studentNo]));
  return {
    stuck: stuckCard(folds),
    submission: submissionCard(folds, roster, now),
    flags: flagCard(events, (id) => noOf.get(id) ?? "?"),
    errors: commonErrors(events),
  };
}
