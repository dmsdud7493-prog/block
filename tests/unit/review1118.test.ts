/** 2026-11-18 실사이트 점검 반영 — 교사 대시보드·학생 화면·보고서 회귀 테스트 */
import { describe, expect, it } from "vitest";
import { DEFAULT_FOLD, foldClass, foldSession, type SessionInfo } from "@/lib/events/fold";
import { fourCards, mergeCards } from "@/lib/events/cards";
import type { EventRow } from "@/lib/events/types";
import { changedSections } from "@/lib/report/diff";
import { emptyReport } from "@/lib/report/template";
import { predictionMatched } from "@/lib/engine/predictionKey";
import { CATALOGS } from "@/lib/engine/experiments";
import { graphTargets, runTarget } from "@/lib/engine/predictionScope";
import { localTutor } from "@/lib/tutor/localTutor";
import { state } from "./tutor/helpers";

const T0 = Date.parse("2026-11-18T00:00:00Z");
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();
const opts = { ...DEFAULT_FOLD, now: T0 + 30 * 60_000 };
const info = (no: string, over: Partial<SessionInfo> = {}): SessionInfo => ({
  sessionId: `s-${no}`, studentId: `u-${no}`, studentNo: no, assignmentId: "a1", title: "끓는점 측정",
  status: "in_progress", currentStep: "design", startedAt: at(0), submittedAt: null, returnedAt: null, dueAt: null, late: false, ...over,
});
const ev = (no: string, type: string, min: number, payload: Record<string, unknown> = {}): EventRow => ({ session_id: `s-${no}`, student_id: `u-${no}`, event_type: type, payload, ts: at(min) });

describe("교사 대시보드", () => {
  it("활동 중인 학생이 혼자여도 오래 머물면(5분↑) 막힘으로 뜬다", () => {
    const f = foldClass([info("2702")], [ev("2702", "calc_checked", 20, { key: "k", correct: true })], opts)[0];
    expect(f.stuck.map((r) => r.code)).toEqual(["dwell"]);
  });
  it("그래프에서 읽는 값(끓는점)을 3번 틀리면 그래프 읽기에 맞는 다음 행동을 준다", () => {
    const tries = [1, 2, 3].map((i) => ev("1", "calc_checked", 25 + i, { key: "bp.water.t1", correct: false }));
    const f = foldClass([info("1")], tries, opts)[0];
    expect(f.stuck[0].code).toBe("graph_retry");
    expect(f.nextAction).toContain("평평한 구간");
  });
  it("도와줄까? — 보냄 → 예/아니요가 보드 상태로 접힌다", () => {
    expect(foldSession(info("1"), [ev("1", "help_offered", 10)], opts).help).toBe("offered");
    expect(foldSession(info("1"), [ev("1", "help_offered", 10), ev("1", "help_answered", 11, { answer: "yes" })], opts).help).toBe("yes");
  });
  it("첫 화면은 실험 여러 개의 카드를 합친다(막힌 학생·채점 기다림에 실험 이름, 시작 안 함은 아무 것도 시작 안 한 학생)", () => {
    const roster = [{ studentId: "u-1", studentNo: "1" }, { studentId: "u-2", studentNo: "2" }];
    const stuck = foldClass([info("1")], [1, 2, 3].map((i) => ev("1", "sim_error_flagged", 20 + i)), opts);
    const done = foldClass([info("2", { status: "submitted", submittedAt: at(5) })], [], opts);
    const merged = mergeCards([{ title: "끓는점 측정", cards: fourCards(stuck, [], roster, opts.now) }, { title: "밀도 측정", cards: fourCards(done, [], roster, opts.now) }]);
    expect(merged.stuck.students.map((s) => `${s.studentNo}:${s.title}`)).toEqual(["1:끓는점 측정"]);
    expect(merged.submission.toGrade.map((g) => `${g.studentNo}:${g.title}`)).toEqual(["2:밀도 측정"]);
    expect(merged.submission.notStarted).toEqual([]);
  });
  it("예상 vs 결과 — 서버 정답표로 같음/다름을 판정한다(모르는 문항은 null)", () => {
    expect(predictionMatched("boiling", "graph_while_boiling", "flat")).toBe(true);
    expect(predictionMatched("melting", "graph_shape", "rise")).toBe(false);
    expect(predictionMatched("density", "nope", "x")).toBeNull();
    Object.values(CATALOGS).forEach((c) => c.predictionTargets.forEach((t) => expect(predictionMatched(c.slug, t.id, t.choices[0].id)).not.toBeNull()));
  });
  it("다시 낸 보고서에서 고친 칸만 찾는다", () => {
    const prev = { ...emptyReport(), activities: [{ title: "활동 1", steps: "➊ 붓는다" }] };
    const cur = { ...prev, activities: [{ title: "활동 1", steps: "➊ 붓는다\n➋ 잰다" }], reflection: { ...prev.reflection, hardest: "부피 재기가 어려웠다" } };
    expect(changedSections(prev, cur)).toEqual(["과정: 활동 1", "성찰: 어려웠던 점"]);
  });
});

describe("학생 화면", () => {
  it("미션이 정한 예측만 묻는다(녹는점 미션 ②는 3 g·6 g 질문이 아니라 두 물질 비교)", () => {
    const melting = CATALOGS.melting;
    const m2 = melting.missions![1].predict;
    expect(runTarget(melting, { experiment: "melting", steps: [], variables: [] }, m2)).toBe("two_mp");
    expect(graphTargets(melting, { experiment: "melting", steps: [], variables: [] }, m2)).toEqual(["two_mp"]);
    Object.values(CATALOGS).forEach((c) => (c.missions ?? []).forEach((m) => (m.predict ?? []).forEach((id) => expect(c.predictionTargets.some((t) => t.id === id)).toBe(true))));
  });
  it("튜터: 틀린 계산 칸이 있으면 '몰라'에도 그 칸부터 짚는다", () => {
    const s = { ...state({ checks: [{ key: "bp.water.t1", label: "끓는점", correct: false, errorType: "plateau", attempts: 3 }] }), off_task: true, off_task_streak: 1 };
    expect(localTutor(s, "몰라", null).reply).toContain("'끓는점' 칸");
  });
});
