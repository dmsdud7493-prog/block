import { describe, expect, it } from "vitest";
import { DEFAULT_FOLD, foldClass, foldSession, median, type SessionInfo } from "@/lib/events/fold";
import { commonErrors, fourCards, submissionCard } from "@/lib/events/cards";
import type { EventRow } from "@/lib/events/types";

const T0 = Date.parse("2026-10-27T01:00:00Z");
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();
const opts = { ...DEFAULT_FOLD, now: T0 + 40 * 60_000 };

const info = (no: string, over: Partial<SessionInfo> = {}): SessionInfo => ({
  sessionId: `s-${no}`, studentId: `u-${no}`, studentNo: no, assignmentId: "a1", title: "밀도",
  status: "in_progress", currentStep: "design", startedAt: at(0), submittedAt: null, returnedAt: null, dueAt: null, late: false, ...over,
});
const ev = (no: string, type: string, min: number, payload: Record<string, unknown> = {}): EventRow => ({ session_id: `s-${no}`, student_id: `u-${no}`, event_type: type, payload, ts: at(min) });

describe("foldSession", () => {
  it("이벤트 순서와 무관하게 단계·체류 시간·실행 수를 접는다", () => {
    const events = [ev("1", "graph_opened", 30), ev("1", "run_completed", 20), ev("1", "prediction_made", 10)];
    const f = foldSession(info("1"), events, opts);
    expect(f.step).toBe("graph");
    expect(f.dwellSec).toBe(10 * 60);
    expect(f.runs).toBe(1);
    expect(f.lastActivity).toBe(at(30));
  });
  it("계산값을 맞히면 그 칸의 재시도 횟수는 지워진다", () => {
    const events = [ev("1", "calc_checked", 21, { key: "k", correct: false }), ev("1", "calc_checked", 22, { key: "k", correct: true })];
    expect(foldSession(info("1"), events, opts).openCalcWrong).toEqual({});
  });
  it("제출한 세션은 활동 중이 아니다", () => {
    expect(foldSession(info("1", { status: "submitted" }), [], opts).active).toBe(false);
  });
});

describe("막힘 판정 (plan S7: 3가지)", () => {
  const peers = ["2", "3", "4"].flatMap((no) => [ev(no, "prediction_made", 35)]);
  const sessions = [info("1"), info("2"), info("3"), info("4"), info("5")];

  it("① 체류: 같은 단계에 반 중앙값×2 이상, 최소 5분 이상 머물면 막힘", () => {
    const folds = foldClass(sessions, [...peers, ev("1", "block_edit", 39), ev("1", "session_started", 0), ev("5", "prediction_made", 36)], opts);
    const me = folds.find((f) => f.studentNo === "1")!;
    expect(me.stuck.map((r) => r.code)).toEqual(["dwell"]);
    expect(me.nextAction).toBeTruthy();
    expect(folds.filter((f) => f.studentNo !== "1").every((f) => f.stuck.length === 0)).toBe(true);
  });
  it("② 실행 오류가 연속 3번이면 막힘, 성공하면 초기화", () => {
    const errs = [31, 32, 33].map((m) => ev("2", "sim_error_flagged", m, { codes: ["tare_not_scale"] }));
    expect(foldClass(sessions, [...peers, ...errs], opts).find((f) => f.studentNo === "2")!.stuck.map((r) => r.code)).toContain("sim_errors");
    const fixed = [...errs, ev("2", "run_completed", 34)];
    expect(foldClass(sessions, [...peers, ...fixed], opts).find((f) => f.studentNo === "2")!.stuck).toEqual([]);
  });
  it("③ 같은 계산값을 3번 이상 틀린 채 다시 시도 중이면 막힘", () => {
    const tries = [36, 37, 38].map((m) => ev("3", "calc_checked", m, { key: "density.iron.t1", correct: false, errorType: "swapped" }));
    expect(foldClass(sessions, [...peers, ...tries], opts).find((f) => f.studentNo === "3")!.stuck.map((r) => r.code)).toEqual(["calc_retry"]);
  });
  it("오래 활동이 없는(창 밖) 학생은 체류 막힘으로 세지 않는다", () => {
    const folds = foldClass([info("9", { startedAt: at(-120) })], [], opts);
    expect(folds[0].active).toBe(false);
    expect(folds[0].stuck).toEqual([]);
  });
  it("median", () => {
    expect([median([]), median([3, 1, 2]), median([4, 1, 2, 3])]).toEqual([0, 2, 2.5]);
  });
});

describe("4카드", () => {
  it("미제출·지각·채점 대기·미시작", () => {
    const folds = foldClass([
      info("1", { dueAt: at(10) }),
      info("2", { status: "submitted", submittedAt: at(5), late: true }),
      info("3", { status: "resubmitted", submittedAt: at(30), returnedAt: at(20) }),
      info("4", { status: "returned", submittedAt: at(5), returnedAt: at(20) }),
    ], [], opts);
    const card = submissionCard(folds, ["1", "2", "3", "4", "5"].map((n) => ({ studentId: `u-${n}`, studentNo: n })), opts.now);
    expect(card.notStarted).toEqual(["5"]);
    expect(card.overdue.map((o) => o.studentNo)).toEqual(["1"]);
    expect(card.toGrade.map((g) => [g.studentNo, g.late, g.resubmitted])).toEqual([["2", true, false], ["3", false, true]]);
    expect(card.returned).toBe(1);
  });
  it("공통 오답: 학생 수 많은 순 상위 3, 정답 이벤트는 세지 않는다", () => {
    const events = [
      ev("1", "calc_checked", 1, { correct: false, errorType: "swapped" }),
      ev("2", "calc_checked", 1, { correct: false, errorType: "swapped" }),
      ev("1", "calc_checked", 2, { correct: false, errorType: "unit" }),
      ev("1", "calc_checked", 3, { correct: false, errorType: "unit" }),
      ev("3", "sim_error_flagged", 1, { codes: ["tare_not_scale"], message: "두 번째 칸에는 전자저울" }),
      ev("4", "calc_checked", 1, { correct: true }),
      ev("4", "calc_checked", 1, { correct: false, errorType: "decimal" }),
    ];
    const top = commonErrors(events);
    expect(top).toHaveLength(3);
    expect(top[0]).toMatchObject({ key: "calc:swapped", students: 2, count: 2 });
    expect(top.map((t) => t.key)).not.toContain("calc:undefined");
  });
  it("플래그 카드는 최신순, 학생 번호를 붙인다", () => {
    const folds = foldClass([info("1"), info("2")], [], opts);
    const events = [ev("1", "ai_flagged", 5, { kind: "self_harm" }), ev("2", "ai_flagged", 9, { kind: null })];
    const cards = fourCards(folds, events, [], opts.now);
    expect(cards.flags.items.map((i) => [i.studentNo, i.kind])).toEqual([["2", "AI가 교사 확인 요청"], ["1", "자해·위기 신호"]]);
  });
});
