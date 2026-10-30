// @vitest-environment jsdom
/** 컴포넌트 접근성 (jest-axe) — plan S2·S5 수용 기준 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import StepStepper from "@/components/inquiry/StepStepper";
import CheckPanel from "@/components/inquiry/CheckPanel";
import InquiryCards from "@/components/inquiry/InquiryCards";
import MissionBar from "@/components/inquiry/MissionBar";
import PredictionGate from "@/components/data/PredictionGate";
import CalcCell from "@/components/data/CalcCell";
import { densityCatalog } from "@/lib/engine/experiments/density/catalog";

const noViolations = async (ui: React.ReactElement) => {
  const { container } = render(ui);
  const results = await axe(container);
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
};

describe("a11y", () => {
  it("StepStepper", () => noViolations(<StepStepper phase="predict" done={{ design: true }} locked={{ report: "잠김" }} onSelect={() => undefined} />));
  it("CheckPanel", () => noViolations(<CheckPanel diagnostics={[{ blockId: "b1", severity: "error", code: "x", message: "빈 칸에 블록을 끼워 주세요.", guideline: "2.3" }]} />));
  it("InquiryCards", () => noViolations(<InquiryCards catalog={densityCatalog} program={{ experiment: "density", steps: [], variables: [] }} inquiry={{ problem: "", hypothesis: "" }} predictions={[]} onInquiry={() => undefined} />));
  it("MissionBar", () => noViolations(<MissionBar progress={{ missions: densityCatalog.missions ?? [], done: [true, false, false], current: 1 }} />));
  it("PredictionGate", () => noViolations(<PredictionGate target={densityCatalog.predictionTargets[0]} record={{ target: "same_density", choice: "", rationale: "", hintsUsed: 2 }} purpose="실험하기 전에" onHint={() => undefined} onSubmit={() => undefined} onCancel={() => undefined} />));
  it("CalcCell (힌트 표시 상태)", () => noViolations(<CalcCell request={{ key: "density.water.t1", trial: 1, label: "밀도", unit: "g/mL", subject: "water", inputs: [] }} entry={{ key: "density.water.t1", runNo: 1, value: "1.2", unit: "g/mL", attempts: 1, correct: false, errorType: "swapped", hint: "나누는 순서를 다시 확인해 볼까요?" }} onCheck={async () => undefined} />));
});

import DataTable from "@/components/data/DataTable";
import AfterExplain from "@/components/data/AfterExplain";
import ReferencePanel from "@/components/data/ReferencePanel";
import { separation2Catalog } from "@/lib/engine/experiments/separation2/catalog";

const run = {
  runNo: 1, ok: true, frames: [], diagnostics: [], series: [], changedVars: [], program: { experiment: "density", steps: [], variables: [] },
  measurements: [{ key: "mass.water.t1", trial: 1, label: "질량", value: 50, unit: "g" as const, subject: "water" }, { key: "volume.water.t1", trial: 1, label: "부피", value: 50, unit: "mL" as const, subject: "water" }],
  calcRequests: [{ key: "density.water.t1", trial: 1, label: "밀도", unit: "g/mL", subject: "water", inputs: ["mass.water.t1", "volume.water.t1"] }],
};

describe("a11y — 결과 영역", () => {
  it("DataTable", () => noViolations(<DataTable catalog={densityCatalog} run={run} calc={{}} onCheck={async () => undefined} />));
  it("AfterExplain", () => noViolations(<AfterExplain targets={densityCatalog.predictionTargets} predictions={[{ target: "same_density", choice: "same", rationale: "같은 철이라서", hintsUsed: 0 }]} onSave={() => undefined} />));
  it("ReferencePanel (용해도 표)", () => noViolations(<ReferencePanel table={separation2Catalog.reference![0]} />));
});

import ReportForm from "@/components/report/ReportForm";
import ReflectionForm from "@/components/report/ReflectionForm";
import SubmitGate from "@/components/report/SubmitGate";
import { emptyReport } from "@/lib/report/template";

describe("a11y — 보고서 (S6)", () => {
  const c = emptyReport();
  it("ReportForm", () => noViolations(<ReportForm content={c} update={() => undefined} readOnly={false} onFocusSection={() => undefined} />));
  it("ReflectionForm", () => noViolations(<ReflectionForm content={c} update={() => undefined} readOnly={false} onFocusSection={() => undefined} />));
  it("SubmitGate", () => noViolations(<SubmitGate content={c} aiAssisted={[]} setAi={() => undefined} onSubmit={() => undefined} error={null} mode="session" locked={false} />));
});
