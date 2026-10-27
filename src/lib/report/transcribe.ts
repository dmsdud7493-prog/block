/**
 * 실험 기록 → 보고서 초안 (지침 6.2). 자동으로 옮긴 칸에는 "초안" 표시가 붙고 학생이 고친다.
 * 해석·결론과 성찰은 옮기지 않는다 — 학생이 직접 쓴다(지침 5.4).
 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { LabState } from "@/components/lab/types";
import { renderProgram } from "@/lib/engine/dsl/render";
import { fmtNum } from "@/lib/engine/format";
import { latestRun } from "@/components/lab/state";
import { emptyReport, type ReportContent } from "./template";

const opt = (c: AnyCatalog, id: string | null) => c.variableOptions.find((o) => o.id === id)?.label ?? "";
const itemLabel = (c: AnyCatalog, id: string) => c.items.find((i) => i.id === id)?.label ?? id;

function variablesOf(c: AnyCatalog, s: LabState): ReportContent["variables"] {
  const pick = (role: string) => s.program.variables.filter((v) => v.role === role).map((v) => opt(c, v.optionId)).filter(Boolean).join(", ");
  return { independent: pick("independent"), dependent: pick("dependent"), controlled: pick("controlled") };
}

function materialsOf(c: AnyCatalog, s: LabState): string {
  const ids = s.program.steps.flatMap((st) => st.slots).flatMap((v) => (v && v.kind === "equip" ? [v.id] : []));
  return [...new Set(ids)].map((id) => itemLabel(c, id)).join(", ");
}

function resultsOf(c: AnyCatalog, s: LabState): string {
  const run = latestRun(s);
  if (!run) return "";
  const lines = run.measurements.map((m) => `${m.trial}회 ${itemLabel(c, m.subject)} ${m.label}: ${fmtNum(m.value)} ${m.unit}`);
  const calc = Object.values(s.calc).filter((e) => e.correct).map((e) => `${run.calcRequests.find((r) => r.key === e.key)?.label ?? e.key}(${itemLabel(c, run.calcRequests.find((r) => r.key === e.key)?.subject ?? "")}): ${e.value} ${e.unit}`);
  return [...lines, ...calc].join("\n");
}

function hypothesisOf(c: AnyCatalog, s: LabState): string {
  if (s.inquiry.hypothesis.trim()) return s.inquiry.hypothesis.trim();
  return s.predictions.filter((p) => p.choice).map((p) => {
    const target = c.predictionTargets.find((x) => x.id === p.target);
    const choice = target?.choices.find((x) => x.id === p.choice)?.label ?? p.choice;
    return `${choice}. 왜냐하면 ${p.rationale}`;
  }).join("\n");
}

export function transcribe(c: AnyCatalog, s: LabState): ReportContent {
  const base = emptyReport();
  const draft: ReportContent = {
    ...base,
    title: s.inquiry.problem.trim() || `${c.title} 탐구`,
    goal: c.goal,
    hypothesis: hypothesisOf(c, s),
    variables: variablesOf(c, s),
    materials: materialsOf(c, s),
    procedure: renderProgram(c, s.program.steps).map((line, i) => `${i + 1}. ${line}`).join("\n"),
    results: resultsOf(c, s),
    drafts: ["title", "goal", "hypothesis", "variables", "materials", "procedure", "results"],
  };
  return draft;
}

/** 저장된 보고서가 있으면 그대로, 비어 있으면 초안을 만든다 */
export function initialReport(c: AnyCatalog, s: LabState, saved: Partial<ReportContent> | null): ReportContent {
  const hasSaved = saved && Object.keys(saved).length > 0;
  return hasSaved ? { ...emptyReport(), ...saved } as ReportContent : transcribe(c, s);
}
