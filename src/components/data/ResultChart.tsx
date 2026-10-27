"use client";
/**
 * 결과 그래프 (요구사항 8) — 실험 종류에 맞는 그래프 + 이전 실행 겹쳐 보기(지침 3.4).
 * 그래프 옆에는 항상 같은 값의 표가 있다(색·그림만으로 정보 전달 금지, KWCAG).
 */
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { RunRecord } from "@/components/lab/types";
import { fmtNum } from "@/lib/engine/format";

const COLORS = ["#1d4ed8", "#b45309", "#047857", "#7c3aed", "#be123c", "#0e7490"];
const labelOf = (c: AnyCatalog, id: string) => c.items.find((i) => i.id === id)?.label ?? id;

function MassVolume({ catalog, run }: { catalog: AnyCatalog; run: RunRecord }) {
  const pairs = run.calcRequests.map((r) => {
    const m = run.measurements.find((x) => x.key === r.inputs[0]);
    const v = run.measurements.find((x) => x.key === r.inputs[1]);
    return m && v ? { name: `${labelOf(catalog, r.subject)} (${r.trial}회)`, data: [{ x: 0, y: 0 }, { x: v.value, y: m.value }] } : null;
  }).filter((p): p is NonNullable<typeof p> => p !== null);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name="부피" unit=" mL" label={{ value: "부피 (mL)", position: "insideBottom", offset: -10 }} />
        <YAxis type="number" dataKey="y" name="질량" unit=" g" label={{ value: "질량 (g)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend verticalAlign="top" />
        {pairs.map((p, i) => <Scatter key={p.name} name={p.name} data={p.data} fill={COLORS[i % COLORS.length]} line shape="circle" />)}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

interface Line2 { key: string; name: string; points: { t: number; temp: number }[]; dashed: boolean }

function seriesLines(catalog: AnyCatalog, runs: RunRecord[]): Line2[] {
  return runs.flatMap((run, ri) => run.series.map((s) => ({
    key: `${run.runNo}-${s.key}`,
    name: `${labelOf(catalog, s.subject)} · ${run.runNo}회차`,
    points: s.points,
    dashed: ri < runs.length - 1,
  })));
}

function TimeTemp({ catalog, runs }: { catalog: AnyCatalog; runs: RunRecord[] }) {
  const lines = seriesLines(catalog, runs);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="t" unit="초" label={{ value: "시간 (초)", position: "insideBottom", offset: -10 }} allowDuplicatedCategory={false} />
        <YAxis type="number" dataKey="temp" unit="℃" domain={["auto", "auto"]} label={{ value: "온도 (℃)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend verticalAlign="top" />
        {lines.map((l, i) => <Line key={l.key} data={l.points} dataKey="temp" name={l.name} stroke={COLORS[i % COLORS.length]} strokeDasharray={l.dashed ? "6 4" : undefined} dot={{ r: 2 }} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

function SeriesTable({ catalog, run }: { catalog: AnyCatalog; run: RunRecord }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold">표로 보기 (시간–온도 기록)</summary>
      {run.series.map((s) => <SeriesRows key={s.key} title={labelOf(catalog, s.subject)} points={s.points} />)}
    </details>
  );
}

function SeriesRows({ title, points }: { title: string; points: { t: number; temp: number }[] }) {
  return (
    <table className="mt-1 w-full text-xs tabular-nums">
      <caption className="text-left font-semibold">{title}</caption>
      <thead><tr><th scope="col">시간(초)</th><th scope="col">온도(℃)</th></tr></thead>
      <tbody>{points.map((p) => <tr key={p.t}><td className="text-center">{p.t}</td><td className="text-center">{fmtNum(p.temp)}</td></tr>)}</tbody>
    </table>
  );
}

function AmountBars({ catalog, run }: { catalog: AnyCatalog; run: RunRecord }) {
  const data = run.measurements.filter((m) => m.key.startsWith("dissolved.") || m.key.startsWith("crystal_mass")).map((m) => ({ name: `${labelOf(catalog, m.subject)} ${m.trial}회`, value: m.value }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis unit=" g" />
        <Tooltip />
        <Bar dataKey="value" name="녹은 양 / 결정 질량 (g)" fill={COLORS[0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ResultChart({ catalog, runs }: { catalog: AnyCatalog; runs: RunRecord[] }) {
  const okRuns = runs.filter((r) => r.ok);
  const last = okRuns[okRuns.length - 1];
  if (!last) return <p className="text-sm text-muted">성공한 실행이 있어야 그래프를 그릴 수 있어요.</p>;
  const hasSeries = okRuns.some((r) => r.series.length > 0);
  return (
    <figure aria-label={`${catalog.title} 결과 그래프`} className="rounded-lg border border-line bg-panel p-2">
      <figcaption className="font-bold">📈 결과 그래프 {okRuns.length > 1 ? "(점선: 이전 실행)" : ""}</figcaption>
      {catalog.slug === "density" ? <MassVolume catalog={catalog} run={last} /> : null}
      {hasSeries ? <TimeTemp catalog={catalog} runs={okRuns.slice(-3)} /> : null}
      {!hasSeries && catalog.slug !== "density" ? <AmountBars catalog={catalog} run={last} /> : null}
      {hasSeries ? <SeriesTable catalog={catalog} run={last} /> : null}
    </figure>
  );
}
