/**
 * 교사 대시보드 데이터 (T-03·T-04·T-05). 모두 교사 쿠키 세션 + RLS로 읽는다 — 다른 반은 0행.
 * events 로그를 접어(fold) 4카드와 실시간 보드를 만든다 (D11).
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_FOLD, foldClass, type SessionInfo, type SessionStatus } from "@/lib/events/fold";
import { fourCards, mergeCards } from "@/lib/events/cards";
import type { EventRow } from "@/lib/events/types";
import { classDetail, teacherClasses } from "./teacher";
import { predictionMatched } from "@/lib/engine/predictionKey";
import { reportContentSchema } from "@/lib/report/template";
import { changedSections } from "@/lib/report/diff";
import type { ClassBoard, ChatLine, ClassReportItem, ClassReports, RunLine, SessionDetail, SubmissionDetail } from "@/lib/teacherTypes";

const EVENT_PAGE = 1000;
const EVENT_LIMIT = 20000;

type Db = Awaited<ReturnType<typeof createClient>>;
type Embedded<T> = T | T[] | null;
const one = <T,>(v: Embedded<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

interface SessionRow {
  id: string;
  student_id: string;
  status: SessionStatus;
  current_step: string;
  started_at: string;
  submitted_at: string | null;
  submissions: Embedded<{ id: string; submitted_at: string; returned_at: string | null; late: boolean }>;
  predictions: { target: string; choice: string }[] | null;
}

async function loadSessions(db: Db, assignmentId: string): Promise<SessionRow[]> {
  const { data } = await db.from("sessions")
    .select("id, student_id, status, current_step, started_at, submitted_at, submissions(id, submitted_at, returned_at, late), predictions(target, choice)")
    .eq("assignment_id", assignmentId);
  return (data ?? []) as unknown as SessionRow[];
}

/** Supabase는 한 번에 최대 1,000행만 돌려준다(max_rows). 한 반 28명 한 차시면 블록 기록만으로 1,000행을 넘으므로
 *  1,000행씩 나눠 끝까지 읽는다(2026-11-18 수업 전 점검). 최신순·id로 순서를 고정해 쪽이 겹치거나 빠지지 않게 한다 */
async function eventPage(db: Db, classId: string, sessionIds: string[], from: number): Promise<EventRow[]> {
  const { data } = await db.from("events")
    .select("session_id, student_id, event_type, payload, ts")
    .eq("class_id", classId).in("session_id", sessionIds)
    .order("ts", { ascending: false }).order("id", { ascending: false })
    .range(from, from + EVENT_PAGE - 1);
  const rows = (data ?? []) as EventRow[];
  if (rows.length < EVENT_PAGE || from + EVENT_PAGE >= EVENT_LIMIT) return rows;
  return [...rows, ...(await eventPage(db, classId, sessionIds, from + EVENT_PAGE))];
}

async function loadEvents(db: Db, classId: string, sessionIds: string[]): Promise<EventRow[]> {
  if (sessionIds.length === 0) return [];
  return eventPage(db, classId, sessionIds, 0);
}

/** T-04 실시간 보드 + 4카드 — 과제 하나(기본: 가장 최근 배정)를 기준으로 */
export async function classBoard(classId: string, assignmentId?: string | null): Promise<ClassBoard | null> {
  try {
    const cls = await classDetail(classId);
    if (!cls) return null;
    const assignment = cls.assignments.find((a) => a.id === assignmentId) ?? cls.assignments[cls.assignments.length - 1] ?? null;
    const empty = { classId, className: cls.name, assignments: cls.assignments, assignment, folds: [], submissionIdOf: {} };
    const now = Date.now();
    if (!assignment) return { ...empty, cards: fourCards([], [], [], now), generatedAt: now };
    const db = await createClient();
    const rows = await loadSessions(db, assignment.id);
    const events = await loadEvents(db, classId, rows.map((r) => r.id));
    const noOf = new Map(cls.students.map((s) => [s.id, s.studentNo]));
    const infos: SessionInfo[] = rows.map((r) => {
      const sub = one(r.submissions);
      return {
        sessionId: r.id, studentId: r.student_id, studentNo: noOf.get(r.student_id) ?? "?", assignmentId: assignment.id, title: assignment.title,
        status: r.status, currentStep: r.current_step, startedAt: r.started_at, submittedAt: sub?.submitted_at ?? r.submitted_at,
        returnedAt: sub?.returned_at ?? null, dueAt: assignment.dueAt, late: sub?.late ?? false,
      };
    });
    const verdicts = new Map(rows.map((r) => [r.id, (r.predictions ?? []).map((p) => predictionMatched(assignment.slug, p.target, p.choice))]));
    const folds = foldClass(infos, events, { ...DEFAULT_FOLD, now })
      .map((f) => ({ ...f, predictionsMatched: (verdicts.get(f.sessionId) ?? []).filter((v) => v === true).length, predictionsMismatched: (verdicts.get(f.sessionId) ?? []).filter((v) => v === false).length }))
      .sort((a, b) => a.studentNo.localeCompare(b.studentNo, "ko", { numeric: true }));
    const roster = cls.students.map((s) => ({ studentId: s.id, studentNo: s.studentNo }));
    const submissionIdOf = Object.fromEntries(rows.flatMap((r) => { const s = one(r.submissions); return s ? [[r.id, s.id]] : []; }));
    return { ...empty, folds, cards: fourCards(folds, events, roster, now), submissionIdOf, generatedAt: now };
  } catch {
    return null;
  }
}

/** 한 반의 배정한 실험 모두를 모은 4카드 — 어느 실험에서 막혔든 첫 화면에 보이도록 (2026-11-18 점검) */
async function classOverview(classId: string): Promise<ClassBoard | null> {
  const first = await classBoard(classId);
  if (!first || first.assignments.length <= 1) return first;
  const rest = await Promise.all(first.assignments.filter((a) => a.id !== first.assignment?.id).map((a) => classBoard(classId, a.id)));
  const boards = [first, ...rest].filter((b): b is ClassBoard => b !== null && b.assignment !== null);
  return {
    ...first,
    assignment: null,
    folds: boards.flatMap((b) => b.folds),
    cards: mergeCards(boards.map((b) => ({ title: b.assignment!.title, cards: b.cards }))),
    submissionIdOf: Object.assign({}, ...boards.map((b) => b.submissionIdOf)),
  };
}

/** T-03: 내 반 모두의 4카드 (배정한 실험 모두 합친 것) */
export async function dashboardOverview(): Promise<ClassBoard[]> {
  try {
    const classes = await teacherClasses();
    const boards = await Promise.all(classes.map((c) => classOverview(c.id)));
    return boards.filter((b): b is ClassBoard => b !== null);
  } catch {
    return [];
  }
}

interface SessionHead {
  id: string; student_id: string; class_id: string; status: SessionStatus; current_step: string; started_at: string;
  assignments: Embedded<{ due_at: string | null; experiments: Embedded<{ slug: string; title: string }> }>;
  submissions: Embedded<{ id: string }>;
}

async function studentNo(db: Db, classId: string, studentId: string): Promise<string> {
  const { data } = await db.from("enrollments").select("student_no").eq("class_id", classId).eq("student_id", studentId).maybeSingle();
  return data?.student_no ?? "?";
}

/** 학생 상세 (블록·실행·대화 탭) — 교사는 자기 반 학생 대화 전체를 볼 수 있다 (R6, 학생에게 고지됨) */
export async function sessionDetail(sessionId: string): Promise<SessionDetail | null> {
  try {
    const db = await createClient();
    const head = (await db.from("sessions").select("id, student_id, class_id, status, current_step, started_at, assignments(due_at, experiments(slug, title)), submissions(id)").eq("id", sessionId).maybeSingle()).data as unknown as SessionHead | null;
    if (!head) return null;
    const exp = one(one(head.assignments)?.experiments ?? null);
    const [no, prog, runs, calc, preds, chat, report] = await Promise.all([
      studentNo(db, head.class_id, head.student_id),
      db.from("block_programs").select("program").eq("session_id", sessionId).order("version", { ascending: false }).limit(1).maybeSingle(),
      db.from("runs").select("run_no, ok, program, measurements, calc_requests, series, diagnostics, changed_vars, created_at").eq("session_id", sessionId).order("run_no"),
      db.from("measurements").select("key, value, unit, is_correct, error_type, attempt, created_at").eq("session_id", sessionId).order("created_at"),
      db.from("predictions").select("target, choice, rationale, matched, rationale_after, hints_used").eq("session_id", sessionId),
      db.from("chat_messages").select("role, content, flagged, created_at").eq("session_id", sessionId).order("created_at"),
      db.from("reports").select("content, ai_assisted_sections, updated_at").eq("session_id", sessionId).maybeSingle(),
    ]);
    const rep = report.data as { content: Record<string, unknown>; ai_assisted_sections: string[]; updated_at: string } | null;
    return {
      sessionId, classId: head.class_id, studentNo: no, slug: exp?.slug ?? "", title: exp?.title ?? "", status: head.status,
      currentStep: head.current_step, startedAt: head.started_at, submissionId: one(head.submissions)?.id ?? null,
      program: (prog.data?.program as SessionDetail["program"]) ?? null,
      runs: (runs.data ?? []) as RunLine[],
      calc: (calc.data ?? []) as SessionDetail["calc"],
      predictions: (preds.data ?? []) as SessionDetail["predictions"],
      chat: (chat.data ?? []) as ChatLine[],
      report: rep && Object.keys(rep.content ?? {}).length > 0 ? { content: rep.content, aiAssisted: rep.ai_assisted_sections ?? [], updatedAt: rep.updated_at } : null,
    };
  } catch {
    return null;
  }
}

interface SubmissionRow {
  id: string; session_id: string; submitted_at: string; late: boolean; version: number; report_snapshot: Record<string, unknown>;
  rubric_scores: Record<string, string> | null; teacher_feedback: string | null; returned_at: string | null; previous_snapshot: Record<string, unknown> | null;
  sessions: Embedded<SessionHead>;
}

/** T-05 제출물 + 채점 초안 + 채점 이력 */
export async function submissionDetail(submissionId: string): Promise<SubmissionDetail | null> {
  try {
    const db = await createClient();
    const row = (await db.from("submissions")
      .select("id, session_id, submitted_at, late, version, report_snapshot, rubric_scores, teacher_feedback, returned_at, previous_snapshot, sessions(id, student_id, class_id, status, current_step, started_at, assignments(due_at, experiments(slug, title)), submissions(id))")
      .eq("id", submissionId).maybeSingle()).data as unknown as SubmissionRow | null;
    const sess = row ? one(row.sessions) : null;
    if (!row || !sess) return null;
    const exp = one(one(sess.assignments)?.experiments ?? null);
    const [no, draft, gradeAuditLog] = await Promise.all([
      studentNo(db, sess.class_id, sess.student_id),
      db.from("grade_drafts").select("rubric, feedback, updated_at").eq("submission_id", submissionId).maybeSingle(),
      db.from("grade_audit_log").select("reason, created_at, after").eq("submission_id", submissionId).order("created_at", { ascending: false }),
    ]);
    const snap = row.report_snapshot as { content?: Record<string, unknown>; ai_assisted_sections?: string[] };
    const audits = (gradeAuditLog.data ?? []) as { reason: string; created_at: string; after: { rubric?: Record<string, string>; feedback?: string } | null }[];
    // 다시 낸 보고서는 지난 채점(감사 로그의 마지막 값)을 미리 채워 둔다 — 고친 칸만 다시 보면 되도록
    const last = audits[0]?.after ?? null;
    const prevContent = (row.previous_snapshot as { content?: unknown } | null)?.content;
    const prevParsed = prevContent ? reportContentSchema.safeParse(prevContent) : null;
    const curParsed = reportContentSchema.safeParse(snap.content ?? {});
    return {
      submissionId, sessionId: sess.id, classId: sess.class_id, studentNo: no, slug: exp?.slug ?? "", title: exp?.title ?? "",
      status: sess.status, submittedAt: row.submitted_at, late: row.late, version: row.version, returnedAt: row.returned_at,
      content: snap.content ?? {}, aiAssisted: snap.ai_assisted_sections ?? [],
      rubric: row.rubric_scores ?? last?.rubric ?? {}, feedback: row.teacher_feedback ?? last?.feedback ?? "",
      changed: prevParsed?.success && curParsed.success ? changedSections(prevParsed.data, curParsed.data) : null,
      loadedAt: Date.now(),
      draft: draft.data ? { rubric: draft.data.rubric as Record<string, string>, feedback: draft.data.feedback as string, updatedAt: draft.data.updated_at as string } : null,
      history: audits.map((a) => ({ reason: a.reason, at: a.created_at })),
    };
  } catch {
    return null;
  }
}

interface ReportRow {
  id: string; student_id: string; status: SessionStatus;
  submissions: Embedded<{ id: string; submitted_at: string; late: boolean; version: number; report_snapshot: unknown; rubric_scores: Record<string, string> | null; teacher_feedback: string | null; returned_at: string | null }>;
}

function reportItem(r: ReportRow, studentNo: string): ClassReportItem[] {
  const sub = one(r.submissions);
  if (!sub) return [];
  const snap = (sub.report_snapshot ?? {}) as { content?: Record<string, unknown>; ai_assisted_sections?: string[] };
  const open = r.status === "submitted" || r.status === "resubmitted";
  const state = r.status === "returned" ? "returned" : open && sub.returned_at && sub.returned_at >= sub.submitted_at ? "graded" : "waiting";
  return [{
    submissionId: sub.id, studentNo, submittedAt: sub.submitted_at, late: sub.late, version: sub.version, state,
    content: snap.content ?? {}, aiAssisted: snap.ai_assisted_sections ?? [],
    rubric: sub.returned_at ? sub.rubric_scores ?? {} : {}, feedback: sub.returned_at ? sub.teacher_feedback ?? "" : "",
  }];
}

/** 반 보고서 모아 보기·인쇄 (2026-11-21) — 과제 하나에 제출된 보고서 모두를 학번 순으로. RLS로 내 반만 읽힌다 */
export async function classReports(classId: string, assignmentId?: string | null): Promise<ClassReports | null> {
  try {
    const cls = await classDetail(classId);
    if (!cls) return null;
    const assignment = cls.assignments.find((a) => a.id === assignmentId) ?? cls.assignments[cls.assignments.length - 1] ?? null;
    const head = { classId, className: cls.name, assignments: cls.assignments, assignment };
    if (!assignment) return { ...head, items: [], notSubmitted: [] };
    const db = await createClient();
    const { data } = await db.from("sessions")
      .select("id, student_id, status, submissions(id, submitted_at, late, version, report_snapshot, rubric_scores, teacher_feedback, returned_at)")
      .eq("assignment_id", assignment.id);
    const rows = (data ?? []) as unknown as ReportRow[];
    const noOf = new Map(cls.students.map((s) => [s.id, s.studentNo]));
    const items = rows.flatMap((r) => reportItem(r, noOf.get(r.student_id) ?? "?")).sort((a, b) => a.studentNo.localeCompare(b.studentNo, "ko", { numeric: true }));
    const done = new Set(items.map((i) => i.studentNo));
    return { ...head, items, notSubmitted: cls.students.map((s) => s.studentNo).filter((n) => !done.has(n)) };
  } catch {
    return null;
  }
}
