import { describe, expect, it } from "vitest";
import { emptyReport, reportContentSchema, submitChecklist } from "@/lib/report/template";
import { initialReport, transcribe } from "@/lib/report/transcribe";
import { getCatalog } from "@/lib/engine/experiments";
import { initialLabState } from "@/components/lab/state";
import type { AnyCatalog } from "@/lib/engine/experiments/types";

const ready = () => {
  const c = emptyReport();
  return {
    ...c,
    interpretation: { trend: "", hypothesisVerdict: "supported" as const, evidence: "표의 밀도 값", errorSources: "눈금 오차", improvements: "여러 번 잰다" },
    reflection: { diff: "", hardest: "변인 통제가 어려웠다", curious: "다른 금속도 재 보고 싶다", realLife: "물에 뜨는 기름에서 볼 수 있다" },
  };
};

describe("submitChecklist (지침 6.3·6.4)", () => {
  it("빈 보고서는 모든 조건이 미충족", () => {
    expect(submitChecklist(emptyReport()).every((c) => !c.ok)).toBe(true);
  });
  it("성찰 3개(10자 이상, 탐구 결과 해석과 겹치던 1번 질문은 뺐다)와 결론 요소를 채우면 통과", () => {
    expect(submitChecklist(ready()).every((c) => c.ok)).toBe(true);
  });
  it("성찰이 2개면 reflection 조건만 실패", () => {
    const r = ready();
    const fails = submitChecklist({ ...r, reflection: { ...r.reflection, curious: "짧다" } }).filter((c) => !c.ok).map((c) => c.id);
    expect(fails).toEqual(["reflection"]);
  });
  it("예상이 맞았는지(가설 판단)는 제출 조건이 아니다 — 첫 항목이 빠졌다 (ADR-P19)", () => {
    const r = ready();
    const checks = submitChecklist({ ...r, interpretation: { ...r.interpretation, hypothesisVerdict: "" } });
    expect(checks.map((c) => c.id)).toEqual(["evidence", "error", "improve", "reflection"]);
    expect(checks.every((c) => c.ok)).toBe(true);
  });
  it("보고서 칸은 탐구 활동지 순서이고 변인 칸이 없다 (ADR-P19·P20)", async () => {
    const { SECTIONS } = await import("@/lib/report/template");
    expect(SECTIONS.map((s) => s.id)).not.toContain("variables");
    expect(SECTIONS.map((s) => s.title)).toEqual(["탐구 제목", "목표", "가설", "준비물", "과정", "자료 해석", "정리", "성찰"]);
  });
  it("성찰 질문은 셋 — '예상과 결과가 같거나 달랐던 이유'는 탐구 결과 해석에서만 묻는다", async () => {
    const { REFLECTION_QUESTIONS } = await import("@/lib/report/template");
    expect(REFLECTION_QUESTIONS.map((q) => q.id)).toEqual(["hardest", "curious", "realLife"]);
  });
  it("스키마는 너무 긴 제목을 거부한다", () => {
    expect(reportContentSchema.safeParse({ title: "가".repeat(101) }).success).toBe(false);
  });
});

describe("transcribe (지침 6.2·5.4)", () => {
  const catalog = getCatalog("density") as AnyCatalog;
  const state = initialLabState("density", { inquiry: { problem: "물질마다 밀도가 다를까?", hypothesis: "" } });

  it("기록을 초안으로 옮기되 해석·성찰은 비워 둔다", () => {
    const r = transcribe(catalog, state);
    expect(r.title).toBe("물질마다 밀도가 다를까?");
    expect(r.goal).toBe(catalog.goal);
    expect(r.interpretation.evidence).toBe("");
    expect(Object.values(r.reflection).every((v) => v === "")).toBe(true);
    expect(r.drafts).toContain("results");
    expect(r.drafts).not.toContain("interpretation");
  });
  it("결과는 회차·물질별 표로 옮긴다(맞힌 계산값 포함, 틀린 값은 빈칸)", () => {
    const run = {
      runNo: 1, ok: true, frames: [], series: [], diagnostics: [], changedVars: [], program: { experiment: "density", steps: [], variables: [] },
      measurements: [
        { key: "mass.water.t1", trial: 1, label: "질량", value: 50, unit: "g", subject: "water" },
        { key: "volume.water.t1", trial: 1, label: "부피", value: 50, unit: "mL", subject: "water" },
        { key: "mass.oil.t2", trial: 2, label: "질량", value: 46, unit: "g", subject: "oil" },
        { key: "volume.oil.t2", trial: 2, label: "부피", value: 50, unit: "mL", subject: "oil" },
      ],
      calcRequests: [
        { key: "density.water.t1", trial: 1, label: "밀도", unit: "g/mL", subject: "water", inputs: [] },
        { key: "density.oil.t2", trial: 2, label: "밀도", unit: "g/mL", subject: "oil", inputs: [] },
      ],
    };
    const calc = {
      "density.water.t1": { key: "density.water.t1", runNo: 1, value: "1", unit: "g/mL", attempts: 1, correct: true, errorType: null, hint: null },
      "density.oil.t2": { key: "density.oil.t2", runNo: 1, value: "1.1", unit: "g/mL", attempts: 1, correct: false, errorType: null, hint: null },
    };
    const s = { ...state, runs: [run], calc } as unknown as typeof state;
    expect(transcribe(catalog, s).resultsTable).toEqual({
      columns: ["회차", "물질", "질량(g)", "부피(mL)", "밀도(g/mL)"],
      rows: [["1회", "물", "50", "50", "1"], ["2회", "식용유", "46", "50", "—"]],
    });
  });
  it("저장된 보고서가 있으면 그대로 쓴다", () => {
    expect(initialReport(catalog, state, { title: "내 제목" }).title).toBe("내 제목");
    expect(initialReport(catalog, state, {}).title).toBe("물질마다 밀도가 다를까?");
  });
});
