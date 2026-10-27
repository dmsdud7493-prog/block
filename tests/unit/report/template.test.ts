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
    reflection: { diff: "예상과 달리 밀도가 같았다", hardest: "변인 통제가 어려웠다", curious: "다른 금속도 재 보고 싶다", realLife: "" },
  };
};

describe("submitChecklist (지침 6.3·6.4)", () => {
  it("빈 보고서는 모든 조건이 미충족", () => {
    expect(submitChecklist(emptyReport()).every((c) => !c.ok)).toBe(true);
  });
  it("성찰 3개(10자 이상)와 결론 4요소를 채우면 통과", () => {
    expect(submitChecklist(ready()).every((c) => c.ok)).toBe(true);
  });
  it("성찰이 2개면 reflection 조건만 실패", () => {
    const r = ready();
    const fails = submitChecklist({ ...r, reflection: { ...r.reflection, curious: "짧다" } }).filter((c) => !c.ok).map((c) => c.id);
    expect(fails).toEqual(["reflection"]);
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
  it("저장된 보고서가 있으면 그대로 쓴다", () => {
    expect(initialReport(catalog, state, { title: "내 제목" }).title).toBe("내 제목");
    expect(initialReport(catalog, state, {}).title).toBe("물질마다 밀도가 다를까?");
  });
});
