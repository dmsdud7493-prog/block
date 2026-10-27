/**
 * 불변 events 로그 → 교사 대시보드 상태 (D11, 지침 1.4 교사 뷰·5.1).
 * 순수 함수: 같은 입력이면 같은 결과. 학생 화면에서는 쓰지 않는다(반 평균·순위 비노출).
 *
 * 막힘 판정 (plan S7):
 *  - 체류: 같은 단계에 머문 시간 ≥ max(최소 체류, 활동 중인 학생 체류 시간 중앙값 × N)
 *  - 실행 오류 연속 k회 이상
 *  - 같은 계산값 칸을 k회 이상 다시 시도 중(아직 맞히지 못함)
 */
import { STEP_LABEL, STEP_OF_EVENT, type EventRow, type EventType, type Step } from "./types";

export type SessionStatus = "in_progress" | "submitted" | "returned" | "resubmitted";

export interface SessionInfo {
  sessionId: string;
  studentId: string;
  studentNo: string;
  assignmentId: string;
  title: string;
  status: SessionStatus;
  currentStep: string;
  startedAt: string;
  submittedAt: string | null;
  returnedAt: string | null;
  dueAt: string | null;
  late: boolean;
}

export interface FoldOptions {
  now: number;
  medianFactor: number;
  minDwellSec: number;
  simErrorK: number;
  calcWrongK: number;
  activeWindowSec: number;
}

export const DEFAULT_FOLD: Omit<FoldOptions, "now"> = { medianFactor: 2, minDwellSec: 300, simErrorK: 3, calcWrongK: 3, activeWindowSec: 1200 };

export interface StuckReason { code: "dwell" | "sim_errors" | "calc_retry"; text: string }

export interface StudentFold extends SessionInfo {
  step: Step;
  stepSince: string;
  lastActivity: string;
  dwellSec: number;
  active: boolean;
  runs: number;
  simErrorStreak: number;
  openCalcWrong: Record<string, number>;
  calcCorrect: number;
  predictionsMatched: number;
  predictionsMismatched: number;
  flagged: number;
  aiReplies: number;
  stuck: StuckReason[];
  nextAction: string | null;
}

type Acc = Omit<StudentFold, keyof SessionInfo | "dwellSec" | "active" | "stuck" | "nextAction">;

const KNOWN_STEPS = Object.keys(STEP_LABEL) as Step[];
const toStep = (s: string): Step => (KNOWN_STEPS.includes(s as Step) ? (s as Step) : "design");
const sec = (now: number, iso: string) => Math.max(0, Math.round((now - Date.parse(iso)) / 1000));

function initial(info: SessionInfo): Acc {
  const done = info.status === "submitted" || info.status === "resubmitted";
  return {
    step: done ? "submitted" : toStep(info.currentStep),
    stepSince: info.startedAt,
    lastActivity: info.startedAt,
    runs: 0,
    simErrorStreak: 0,
    openCalcWrong: {},
    calcCorrect: 0,
    predictionsMatched: 0,
    predictionsMismatched: 0,
    flagged: 0,
    aiReplies: 0,
  };
}

function withoutKey(rec: Record<string, number>, key: string): Record<string, number> {
  return Object.fromEntries(Object.entries(rec).filter(([k]) => k !== key));
}

function applyCounters(a: Acc, e: EventRow): Acc {
  const p = e.payload;
  switch (e.event_type as EventType) {
    case "run_completed":
      return { ...a, runs: a.runs + 1, simErrorStreak: 0 };
    case "sim_error_flagged":
      return { ...a, runs: a.runs + 1, simErrorStreak: a.simErrorStreak + 1 };
    case "calc_checked": {
      const key = String(p.key ?? "");
      if (p.correct === true) return { ...a, calcCorrect: a.calcCorrect + 1, openCalcWrong: withoutKey(a.openCalcWrong, key) };
      return { ...a, openCalcWrong: { ...a.openCalcWrong, [key]: (a.openCalcWrong[key] ?? 0) + 1 } };
    }
    case "prediction_explained":
      return p.matched === true ? { ...a, predictionsMatched: a.predictionsMatched + 1 } : { ...a, predictionsMismatched: a.predictionsMismatched + 1 };
    case "ai_flagged":
      return { ...a, flagged: a.flagged + 1 };
    case "ai_reply":
    case "ai_nudge":
      return { ...a, aiReplies: a.aiReplies + 1 };
    default:
      return a;
  }
}

function applyEvent(a: Acc, e: EventRow): Acc {
  const next = STEP_OF_EVENT[e.event_type as EventType];
  const moved = next && next !== a.step ? { step: next, stepSince: e.ts } : {};
  return applyCounters({ ...a, ...moved, lastActivity: e.ts > a.lastActivity ? e.ts : a.lastActivity }, e);
}

/** 한 세션의 이벤트(시간순 아니어도 됨)를 접는다 */
export function foldSession(info: SessionInfo, events: EventRow[], opts: FoldOptions): StudentFold {
  const sorted = [...events].sort((x, y) => x.ts.localeCompare(y.ts));
  const acc = sorted.reduce(applyEvent, initial(info));
  const active = acc.step !== "submitted" && sec(opts.now, acc.lastActivity) <= opts.activeWindowSec;
  return { ...info, ...acc, dwellSec: sec(opts.now, acc.stepSince), active, stuck: [], nextAction: null };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function reasonsOf(f: StudentFold, threshold: number, opts: FoldOptions): StuckReason[] {
  const maxWrong = Math.max(0, ...Object.values(f.openCalcWrong));
  const dwell: StuckReason[] = f.active && f.dwellSec >= threshold
    ? [{ code: "dwell", text: `${STEP_LABEL[f.step]} 단계에 ${Math.round(f.dwellSec / 60)}분째 머물러 있어요` }] : [];
  const sim: StuckReason[] = f.step !== "submitted" && f.simErrorStreak >= opts.simErrorK
    ? [{ code: "sim_errors", text: `실행 오류가 ${f.simErrorStreak}번 이어졌어요` }] : [];
  const calc: StuckReason[] = f.step !== "submitted" && maxWrong >= opts.calcWrongK
    ? [{ code: "calc_retry", text: `같은 계산값을 ${maxWrong}번 다시 시도하고 있어요` }] : [];
  return [...dwell, ...sim, ...calc];
}

const NEXT_ACTION: Record<StuckReason["code"], string> = {
  sim_errors: "모니터의 오류 블록을 함께 보며 ‘어느 블록에서 멈췄는지’ 물어보기",
  calc_retry: "계산식에 어떤 측정값을 넣었는지 말로 설명하게 하기",
  dwell: "지금 무엇을 하려는지 한 문장으로 말해 보게 하기",
};

export function groupBySession(events: EventRow[]): Map<string, EventRow[]> {
  const m = new Map<string, EventRow[]>();
  events.forEach((e) => m.set(e.session_id, [...(m.get(e.session_id) ?? []), e]));
  return m;
}

/** 반 전체를 접고 막힘을 판정한다. 중앙값은 활동 중인(제출 전) 학생만으로 계산 */
export function foldClass(sessions: SessionInfo[], events: EventRow[], opts: FoldOptions): StudentFold[] {
  const bySession = groupBySession(events);
  const folds = sessions.map((s) => foldSession(s, bySession.get(s.sessionId) ?? [], opts));
  const med = median(folds.filter((f) => f.active).map((f) => f.dwellSec));
  const threshold = Math.max(opts.minDwellSec, med * opts.medianFactor);
  return folds.map((f) => {
    const stuck = reasonsOf(f, threshold, opts);
    return { ...f, stuck, nextAction: stuck[0] ? NEXT_ACTION[stuck[0].code] : null };
  });
}
