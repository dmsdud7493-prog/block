// @vitest-environment jsdom
/** 교사 화면 접근성 (plan S7: 테이블 caption·정렬 버튼 aria, 루브릭 fieldset) */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }) }));

import LiveBoard from "@/components/teacher/LiveBoard";
import FourCards from "@/components/teacher/FourCards";
import RubricGrader from "@/components/teacher/RubricGrader";
import ReportReadOnly from "@/components/teacher/ReportReadOnly";
import { DEFAULT_FOLD, foldClass, type SessionInfo } from "@/lib/events/fold";
import { fourCards } from "@/lib/events/cards";
import type { ClassBoard, SubmissionDetail } from "@/lib/teacherTypes";

const now = Date.parse("2026-10-27T02:00:00Z");
const info = (no: string, status: SessionInfo["status"] = "in_progress"): SessionInfo => ({
  sessionId: `s-${no}`, studentId: `u-${no}`, studentNo: no, assignmentId: "a", title: "밀도", status, currentStep: "design",
  startedAt: "2026-10-27T01:30:00Z", submittedAt: status === "submitted" ? "2026-10-27T01:50:00Z" : null, returnedAt: null, dueAt: null, late: false,
});
const events = [{ session_id: "s-1", student_id: "u-1", event_type: "ai_flagged", payload: { kind: "self_harm" }, ts: "2026-10-27T01:40:00Z" }];
const folds = foldClass([info("2"), info("1"), info("3", "submitted")], events, { ...DEFAULT_FOLD, now });
const board: ClassBoard = {
  classId: "c1", className: "2-3", assignments: [], assignment: { id: "a", slug: "density", title: "밀도", dueAt: null, allowLate: true },
  folds, cards: fourCards(folds, events, [{ studentId: "u-9", studentNo: "9" }], now), submissionIdOf: { "s-3": "sub-3" }, generatedAt: now,
};
const detail: SubmissionDetail = {
  submissionId: "sub-3", sessionId: "s-3", classId: "c1", studentNo: "3", slug: "density", title: "밀도", status: "submitted",
  submittedAt: "2026-10-27T01:50:00Z", late: false, version: 1, returnedAt: null, content: {}, aiAssisted: ["results"], rubric: {}, feedback: "", draft: null, history: [],
};

afterEach(() => cleanup());

const noViolations = async (ui: React.ReactElement) => {
  const { container } = render(ui);
  expect((await axe(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
};

describe("a11y — 교사 화면 (S7)", () => {
  it("LiveBoard", () => noViolations(<LiveBoard folds={folds} submissionIdOf={board.submissionIdOf} title="밀도" />));
  it("FourCards", () => noViolations(<FourCards board={board} />));
  it("RubricGrader", () => noViolations(<RubricGrader detail={detail} />));
  it("ReportReadOnly", () => noViolations(<ReportReadOnly content={{}} aiAssisted={["results"]} />));
});

describe("LiveBoard 정렬", () => {
  it("열 버튼을 누르면 aria-sort가 바뀌고 순서가 뒤집힌다", () => {
    render(<LiveBoard folds={folds} submissionIdOf={{}} title="밀도" />);
    const th = screen.getByRole("columnheader", { name: /학번/ });
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    const firstRow = () => screen.getAllByRole("rowheader")[0].textContent;
    expect(firstRow()).toContain("1");
    fireEvent.click(screen.getByRole("button", { name: /학번/ }));
    expect(th.getAttribute("aria-sort")).toBe("descending");
    expect(firstRow()).toContain("3");
  });
});

describe("RubricGrader", () => {
  it("4항목을 모두 고르기 전에는 돌려주기가 꺼져 있다", () => {
    render(<RubricGrader detail={detail} />);
    const btn = screen.getByRole("button", { name: "확정하고 돌려주기" });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    ["가설·변인 설계", "자료 정리", "해석·결론", "성찰"].forEach((t) => {
      const group = screen.getByRole("group", { name: t });
      fireEvent.click(group.querySelector("input")!);
    });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
  it("코멘트 뱅크 문장을 넣을 수 있다", () => {
    render(<RubricGrader detail={detail} />);
    fireEvent.click(screen.getByRole("button", { name: /단위를 꼭 붙여/ }));
    expect((screen.getByLabelText(/학생에게 남길 말/) as HTMLTextAreaElement).value).toContain("단위");
  });
});
