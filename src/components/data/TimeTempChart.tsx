"use client";
/**
 * 시간–온도 그래프 (녹는점·끓는점·혼합물 분리 1) — plan S8.
 * - 실행 여러 번·두 집단(3 g vs 6 g)의 곡선을 겹쳐 그린다(지침 3.4·2.1), 이전 실행은 점선
 * - "내 예상(그림)"을 보라 점선으로 겹친다(지침 3.3)
 * - "평평한 구간 표시"는 학생이 직접 켠다 — 먼저 스스로 찾아보게 한다(지침 1.3)
 */
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { RunRecord } from "@/components/lab/types";

const COLORS = ["#1d4ed8", "#b45309", "#047857", "#be123c", "#0e7490", "#4d7c0f"];
const SKETCH_COLOR = "#7c3aed";
const labelOf = (c: AnyCatalog, id: string) => c.items.find((i) => i.id === id)?.label ?? id;

export interface SketchLine { name: string; points: { t: number; temp: number }[] }
interface Plateau { key: string; x1: number; x2: number }

/** 측정값에서 평탄 구간(시작~끝)을 찾는다: 녹기 시작/끝, 증류 평탄 시작/끝, 끓기 시작~기록 끝 */
export function plateausOf(run: RunRecord): Plateau[] {
  const m = (prefix: string) => run.measurements.filter((x) => x.key.startsWith(prefix));
  const end = (trial: number) => Math.max(0, ...run.series.filter((s) => s.trial === trial).flatMap((s) => s.points.map((p) => p.t)));
  const pairs = (a: string, b: string) => m(a).flatMap((s) => {
    const e = m(b).find((x) => x.trial === s.trial && x.subject === s.subject);
    return e ? [{ key: s.key, x1: s.value, x2: e.value }] : [];
  });
  const boil = m("boil_start.").map((s) => ({ key: s.key, x1: s.value, x2: end(s.trial) }));
  return [...pairs("meltStart.", "meltEnd."), ...pairs("plateau.start.", "plateau.end."), ...boil].filter((p) => p.x2 > p.x1);
}

function lines(catalog: AnyCatalog, runs: RunRecord[]) {
  return runs.flatMap((run, ri) => run.series.map((s) => ({
    key: `${run.runNo}-${s.key}`,
    name: `${labelOf(catalog, s.subject)}${run.series.length > 1 ? ` ${s.trial}회` : ""} · ${run.runNo}회차`,
    points: s.points,
    dashed: ri < runs.length - 1,
  })));
}

type LineSpec = ReturnType<typeof lines>[number];

function Plot({ all, areas, sketches }: { all: LineSpec[]; areas: Plateau[]; sketches: SketchLine[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="t" unit="초" label={{ value: "시간 (초)", position: "insideBottom", offset: -10 }} allowDuplicatedCategory={false} />
        <YAxis type="number" dataKey="temp" unit="℃" domain={["auto", "auto"]} label={{ value: "온도 (℃)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend verticalAlign="top" />
        {areas.map((a) => <ReferenceArea key={a.key} x1={a.x1} x2={a.x2} fill="#f59e0b" fillOpacity={0.18} label={{ value: "온도가 거의 일정한 구간", position: "insideTop", fontSize: 11 }} />)}
        {all.map((l, i) => <Line key={l.key} data={l.points} dataKey="temp" name={l.name} stroke={COLORS[i % COLORS.length]} strokeDasharray={l.dashed ? "6 4" : undefined} dot={{ r: 2 }} isAnimationActive={false} />)}
        {sketches.map((s) => <Line key={s.name} data={s.points} dataKey="temp" name={s.name} stroke={SKETCH_COLOR} strokeWidth={2} strokeDasharray="2 4" dot={{ r: 3 }} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function TimeTempChart({ catalog, runs, sketches }: { catalog: AnyCatalog; runs: RunRecord[]; sketches: SketchLine[] }) {
  const [shade, setShade] = useState(false);
  const last = runs[runs.length - 1];
  const areas = shade && last ? plateausOf(last) : [];
  return (
    <div>
      <Plot all={lines(catalog, runs)} areas={areas} sketches={sketches} />
      <button type="button" aria-pressed={shade} className="tap rounded border border-amber-600 px-3 text-sm text-amber-900" onClick={() => setShade((v) => !v)}>{shade ? "평평한 구간 표시 끄기" : "🔍 평평한 구간 표시하기 (먼저 스스로 찾아본 뒤에)"}</button>
    </div>
  );
}
