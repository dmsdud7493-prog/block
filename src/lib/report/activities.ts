/**
 * 실험 기록 → 보고서 '과정'(활동 1, 2…)과 '자료 해석'(자료 1, 2…) (ADR-P20, 지침 6.2).
 * 블록 절차를 회차(실험 단위)로 나누고, 회차마다 다룬 물질로 활동을 정한다. 자료는 활동별 측정값·맞힌 계산값 표, 관찰, 시간–온도 기록.
 * 정답값은 쓰지 않는다 — 학생이 맞힌 계산값만 옮긴다(규칙 3).
 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { RunRecord, LabState } from "@/components/lab/types";
import type { Step } from "@/lib/engine/types";
import { renderProgram } from "@/lib/engine/dsl/render";
import { splitTrials } from "@/lib/engine/rules/variables";
import { fixJosa, fmtMeasure, fmtNum } from "@/lib/engine/format";
import { missionRuns } from "@/components/lab/missions";
import type { ReportContent } from "./template";

export interface ActivityDef { title: string; subjects: string[] }
type DataItem = ReportContent["data"][number];

const itemLabel = (c: AnyCatalog, id: string) => c.items.find((i) => i.id === id)?.label ?? id;
const MARKS = ["➊", "➋", "➌", "➍", "➎", "➏", "➐", "➑", "➒", "➓"];
export const stepMark = (i: number) => MARKS[i] ?? `${i + 1}.`;

/** 활동 정의 — 카탈로그에 있으면 그대로, 없으면 측정 대상마다 하나("물의 끓는점 측정하기") */
export function activityDefs(c: AnyCatalog): ActivityDef[] {
  if (c.reportActivities?.length) return c.reportActivities;
  if (c.requiredSubjects.length > 1) return c.requiredSubjects.map((id) => ({ title: fixJosa(`${itemLabel(c, id)}의 ${c.title}하기`), subjects: [id] }));
  return [{ title: `${c.title}하기`, subjects: c.requiredSubjects }];
}

const equipOf = (steps: Step[]) => new Set(steps.flatMap((s) => s.slots.flatMap((v) => (v && v.kind === "equip" ? [v.id] : []))));
const frac = (d: ActivityDef, used: Set<string>) => (d.subjects.length ? d.subjects.filter((x) => used.has(x)).length / d.subjects.length : 0);

/** 한 회차가 어느 활동인지 — 측정한 물질로 먼저, 측정이 없으면 블록에 쓴 물질을 모두 다루는 활동(물질이 많은 쪽) */
function pickActivity(defs: ActivityDef[], measured: Set<string>, used: Set<string>, prev: number): number {
  const best = (score: (d: ActivityDef) => number) => defs.reduce((bi, d, i) => (score(d) > score(defs[bi]) ? i : bi), 0);
  if (measured.size > 0 && defs.some((d) => frac(d, measured) > 0)) return best((d) => frac(d, measured));
  const covered = defs.map((d, i) => ({ d, i })).filter(({ d }) => d.subjects.length > 0 && frac(d, used) === 1);
  if (covered.length > 0) return covered.reduce((a, b) => (b.d.subjects.length > a.d.subjects.length ? b : a)).i;
  return defs.some((d) => frac(d, used) > 0) ? best((d) => frac(d, used)) : Math.max(prev, 0);
}

interface Group { def: ActivityDef; trials: number[]; steps: Step[] }

/** 회차를 활동으로 묶는다(처음 나온 순서대로) */
function groupTrials(c: AnyCatalog, steps: Step[], run: RunRecord | null, defs: ActivityDef[] = activityDefs(c)): Group[] {
  const trials = splitTrials(steps, c.isTrialEnd).filter((t) => t.length > 0);
  const measuredIn = (n: number) => new Set([...(run?.measurements ?? []).filter((m) => m.trial === n).map((m) => m.subject), ...(run?.calcRequests ?? []).filter((r) => r.trial === n).map((r) => r.subject)]);
  const picks = trials.reduce<number[]>((acc, t, i) => [...acc, pickActivity(defs, measuredIn(i + 1), equipOf(t), acc[acc.length - 1] ?? 0)], []);
  const order = [...new Set(picks)];
  return order.map((a) => ({
    def: defs[a],
    trials: picks.flatMap((p, i) => (p === a ? [i + 1] : [])),
    steps: trials.flatMap((t, i) => (picks[i] === a ? t : [])),
  }));
}

/** 활동 하나의 측정값·맞힌 계산값 표(행: 회차·물질) */
function tableOf(c: AnyCatalog, s: LabState, run: RunRecord, trials: number[]): Pick<DataItem, "columns" | "rows"> {
  const inT = (n: number) => trials.includes(n);
  const cells = [
    ...run.measurements.filter((m) => inT(m.trial)).map((m) => ({ trial: m.trial, subject: m.subject, col: `${m.label}(${m.unit})`, value: fmtMeasure(m) })),
    ...run.calcRequests.filter((r) => inT(r.trial) && s.calc[r.key]?.correct).map((r) => ({ trial: r.trial, subject: r.subject, col: `${r.label}(${s.calc[r.key].unit})`, value: s.calc[r.key].value })),
  ];
  if (cells.length === 0) return { columns: [], rows: [] };
  const cols = [...new Set(cells.map((x) => x.col))].slice(0, 10);
  const keys = [...new Set(cells.map((x) => `${x.trial}|${x.subject}`))].slice(0, 60);
  const multi = new Set(cells.map((x) => x.trial)).size > 1;
  const rows = keys.map((k) => {
    const [trial, subject] = k.split("|");
    const here = cells.filter((x) => `${x.trial}|${x.subject}` === k);
    return [...(multi ? [`${trial}회`] : []), itemLabel(c, subject), ...cols.map((col) => here.filter((x) => x.col === col).map((x) => x.value).join(", ") || "—")];
  });
  return { columns: [...(multi ? ["회차"] : []), "물질", ...cols], rows };
}

/** 관찰 — 비커 속에서 자리 잡은 순서처럼 표로 나타내기 어려운 결과 */
function observationsOf(run: RunRecord, steps: Step[]): string[] {
  const ids = new Set(steps.map((s) => s.blockId));
  const seen = run.frames.filter((f) => ids.has(f.blockId) && Array.isArray(f.event.settled));
  const last = seen[seen.length - 1];
  const sentence = last ? /비커 속에서[^.]*\./.exec(last.event.note)?.[0] : undefined;
  return sentence ? [sentence] : [];
}

/** 시간–온도 기록(녹는점·끓는점·증류) — 보고서에 담을 만큼 줄인다(최대 40점) */
function seriesOf(c: AnyCatalog, run: RunRecord, trials: number[]): DataItem["series"] {
  return run.series.filter((x) => trials.includes(x.trial)).slice(0, 6).map((x) => {
    const step = Math.max(1, Math.ceil(x.points.length / 40));
    const pts = x.points.filter((_, i) => i % step === 0 || i === x.points.length - 1).map((p): [number, number] => [p.t, p.temp]);
    return { label: `${itemLabel(c, x.subject)}${trials.length > 1 ? ` (${x.trial}회)` : ""}`, points: pts };
  });
}

const lastOkRun = (s: LabState): RunRecord | null => [...s.runs].reverse().find((r) => r.ok) ?? s.runs[s.runs.length - 1] ?? null;

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** 미션마다 활동 하나 — 제목은 미션이 정한 보고서 제목, 없으면 같은 물질을 다루는 기본 활동 제목, 그것도 없으면 미션 문장 */
export function missionDefs(c: AnyCatalog): ActivityDef[] {
  const defs = activityDefs(c);
  return (c.missions ?? []).map((m) => {
    const raw = m.done.solved?.length ? m.done.solved : m.done.event?.settled ?? [];
    const subjects = [...new Set(raw.map((x) => x.split("@")[0]))]; // "kno3@60" → kno3
    return { title: m.report ?? defs.find((d) => sameSet(d.subjects, subjects))?.title ?? m.title, subjects };
  });
}

interface MissionPart { def: ActivityDef; run: RunRecord; trials: number[]; steps: Step[] }

/** 미션을 모두 마쳤으면 미션 순서대로(미션 1 → 과정의 활동 1) 그 미션을 마친 실행에서 해당 회차만 골라 낸다 */
function missionParts(c: AnyCatalog, s: LabState): MissionPart[] | null {
  const runs = missionRuns(c, s);
  if (!runs) return null;
  const defs = missionDefs(c);
  return runs.map((run, i) => {
    const g = groupTrials(c, run.program.steps, run, defs).find((x) => x.def === defs[i]);
    const all = splitTrials(run.program.steps, c.isTrialEnd).map((_, k) => k + 1);
    return { def: defs[i], run, trials: g?.trials ?? all, steps: g?.steps ?? run.program.steps };
  });
}

const stepsText = (c: AnyCatalog, steps: Step[]) => renderProgram(c, steps).map((line, i) => `${stepMark(i)} ${line}`).join("\n");

/** 과정 — 활동별 제목과 ➊➋… 순서. 미션이 있는 실험은 미션을 모두 마친 뒤 미션 순서대로 한데 모은다 */
export function activitiesOf(c: AnyCatalog, s: LabState): ReportContent["activities"] {
  const parts = missionParts(c, s);
  if (parts) return parts.slice(0, 8).map((m) => ({ title: m.def.title, steps: stepsText(c, m.steps) }));
  const run = lastOkRun(s);
  const steps = run?.program.steps ?? s.program.steps;
  return groupTrials(c, steps, run).slice(0, 8).map((g) => ({
    title: g.def.title,
    steps: renderProgram(c, g.steps).map((line, i) => `${stepMark(i)} ${line}`).join("\n"),
  }));
}

/** 자료 해석 — 활동마다 자료 하나(표·관찰·시간–온도). 학생이 쓴 note는 같은 번호끼리 이어 받는다 */
export function dataOf(c: AnyCatalog, s: LabState, notes: string[] = []): ReportContent["data"] {
  const run = lastOkRun(s);
  if (!run) return [];
  const parts = missionParts(c, s) ?? groupTrials(c, run.program.steps, run).map((g) => ({ ...g, run }));
  const items = parts.map((g) => ({
    title: `${g.def.title} 결과`,
    ...tableOf(c, s, g.run, g.trials),
    observations: observationsOf(g.run, g.steps),
    series: seriesOf(c, g.run, g.trials),
  })).filter((d) => d.rows.length > 0 || d.observations.length > 0 || d.series.length > 0);
  return items.slice(0, 8).map((d, i) => ({ ...d, note: notes[i] ?? "" }));
}
