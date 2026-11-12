// @vitest-environment jsdom
/** 교사 학생 상세 — 블록은 회차별로 남고, 계산·예상은 학생 화면과 같은 한국어로, 보고서는 제출 전에도 읽기 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import SessionTabs from "@/components/teacher/SessionTabs";
import { densityCatalog } from "@/lib/engine/experiments/density/catalog";
import { densityPhysics } from "@/lib/engine/experiments/density/physics";
import { simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE } from "@/lib/engine/rng";
import { E, Q, S, prog } from "../unit/engine/helpers";
import type { SessionDetail } from "@/lib/teacherTypes";

afterEach(cleanup);

const src: PhysicsSource = { params: densityPhysics.sessionParams(null, { textbookMode: true }), rng: NO_NOISE, noisy: false };
const program = prog("density", [S("a1", E("cylinder"), E("scale")), S("a2", E("water"), Q(50, "mL")), S("a3", E("water")), S("a4", E("water")), S("a5")]);

function detail(): SessionDetail {
  const r = simulate(program, densityCatalog, src);
  const target = densityCatalog.predictionTargets[0];
  return {
    sessionId: "s1", classId: "c1", studentNo: "2701", slug: "density", title: "밀도", status: "in_progress", currentStep: "design", startedAt: "2026-11-12T00:00:00Z", submissionId: null,
    program: { ...program, steps: [] },
    runs: [{ run_no: 1, ok: true, program, measurements: r.measurements, calc_requests: r.calcRequests, series: r.series, diagnostics: [], changed_vars: [], created_at: "2026-11-12T00:05:00Z" }],
    calc: r.calcRequests.map((q) => ({ key: q.key, value: 1, unit: "g/mL", is_correct: true, error_type: null, attempt: 1, created_at: "2026-11-12T00:06:00Z" })),
    predictions: [{ target: target.id, choice: target.choices[0].id, rationale: "무거우니까", matched: null, rationale_after: null, hints_used: 0 }],
    chat: [], report: null,
  };
}

describe("SessionTabs", () => {
  it("조립판이 비어도 실행한 회차의 블록을 한국어 문장으로 보여 준다", async () => {
    const { container } = render(<SessionTabs detail={detail()} />);
    expect(screen.getByText(/다음 미션을 준비하는 중/)).toBeTruthy();
    expect(screen.getByText(/1회차 실행/)).toBeTruthy();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(3);
    expect((await axe(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it("계산 칸은 '물 1회 · 밀도'처럼, 예상은 질문과 고른 답을 한국어로", () => {
    const d = detail();
    render(<SessionTabs detail={d} initial="runs" />);
    expect(screen.queryByText(/density\./)).toBeNull();
    expect(screen.getByText(/물 1회 · 밀도/)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /예상/ }));
    const t = densityCatalog.predictionTargets[0];
    expect(screen.getByText(t.question)).toBeTruthy();
    expect(screen.getByText(t.choices[0].label)).toBeTruthy();
    expect(screen.queryByText(t.id)).toBeNull();
  });

  it("보고서 탭: 아직 쓰지 않았으면 안내, 쓰는 중이면 제출 전이라고 알리고 읽기 전용으로", () => {
    render(<SessionTabs detail={detail()} initial="report" />);
    expect(screen.getByText(/아직 보고서를 쓰기 시작하지 않았어요/)).toBeTruthy();
  });
});
