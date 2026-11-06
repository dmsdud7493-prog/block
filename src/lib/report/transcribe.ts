/**
 * 실험 기록 → 보고서 초안 (지침 6.2). 자동으로 옮긴 칸에는 "초안" 표시가 붙고 학생이 고친다.
 * 해석·결론과 성찰은 옮기지 않는다 — 학생이 직접 쓴다(지침 5.4). 결과는 표(resultsTable)로 옮긴다.
 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { LabState } from "@/components/lab/types";
import { renderProgram } from "@/lib/engine/dsl/render";
import { fmtNum } from "@/lib/engine/format";
import { latestRun } from "@/components/lab/state";
import { emptyReport, type ReportContent } from "./template";
import { activitiesOf, dataOf } from "./activities";

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

/** 결과 표 — 행: 회차·물질, 열: 측정 항목(단위) + 학생이 맞게 계산한 값. 같은 칸에 값이 여럿이면 쉼표로 잇는다 */
export function resultsTableOf(c: AnyCatalog, s: LabState): ReportContent["resultsTable"] {
  const run = [...s.runs].reverse().find((r) => r.ok) ?? latestRun(s);
  if (!run) return { columns: [], rows: [] };
  const solved = run.calcRequests.filter((r) => s.calc[r.key]?.correct);
  const cells = [
    ...run.measurements.map((m) => ({ trial: m.trial, subject: m.subject, col: `${m.label}(${m.unit})`, value: fmtNum(m.value) })),
    ...solved.map((r) => ({ trial: r.trial, subject: r.subject, col: `${r.label}(${s.calc[r.key].unit})`, value: s.calc[r.key].value })),
  ];
  const cols = [...new Set(cells.map((x) => x.col))].slice(0, 10);
  const keys = [...new Set(cells.map((x) => `${x.trial}|${x.subject}`))].slice(0, 60);
  const multiTrial = new Set(cells.map((x) => x.trial)).size > 1;
  const rows = keys.map((k) => {
    const [trial, subject] = k.split("|");
    const here = cells.filter((x) => `${x.trial}|${x.subject}` === k);
    const vals = cols.map((col) => here.filter((x) => x.col === col).map((x) => x.value).join(", ") || "—");
    return [...(multiTrial ? [`${trial}회`] : []), itemLabel(c, subject), ...vals];
  });
  return { columns: [...(multiTrial ? ["회차"] : []), "물질", ...cols], rows };
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
    resultsTable: resultsTableOf(c, s),
    activities: activitiesOf(c, s),
    data: dataOf(c, s),
    drafts: ["title", "goal", "hypothesis", "materials", "procedure", "results"],
  };
  return draft;
}

/** 저장된 보고서가 있으면 그대로, 비어 있으면 초안을 만든다. 결과 표는 학생이 고치는 칸이 아니므로 실험 기록에서 늘 새로 만든다 */
export function initialReport(c: AnyCatalog, s: LabState, saved: Partial<ReportContent> | null): ReportContent {
  const hasSaved = saved && Object.keys(saved).length > 0;
  if (!hasSaved) return transcribe(c, s);
  const base = { ...emptyReport(), ...saved } as ReportContent;
  if (s.runs.length === 0) return base;
  // 예전 보고서(활동 없이 과정 글만)는 활동 하나로 옮겨 보여 준다. 자료는 실험 기록에서 새로 만들고, 학생이 쓴 "알 수 있는 점"은 이어 받는다
  const activities = base.activities.length > 0 ? base.activities : activitiesOf(c, s);
  return { ...base, resultsTable: resultsTableOf(c, s), activities, data: dataOf(c, s, base.data.map((d) => d.note)) };
}
