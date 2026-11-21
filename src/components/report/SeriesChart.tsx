"use client";
/** 보고서 자료의 시간–온도 그래프 — 보고서에 저장된 줄인 기록으로 그린다(학생·교사 화면 공용). 같은 값의 표는 접어서 함께 둔다 */
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReportContent } from "@/lib/report/template";

type Series = ReportContent["data"][number]["series"];
type Axis = NonNullable<ReportContent["data"][number]["axis"]>;
const TIME_TEMP: Axis = { x: "시간", xUnit: "초", y: "온도", yUnit: "℃" };
const COLORS = ["#1d4ed8", "#b45309", "#047857", "#7c3aed", "#be123c", "#0e7490"];

function Table({ series, axis }: { series: Series; axis: Axis }) {
  return (
    <details className="text-xs print:hidden">
      <summary className="cursor-pointer font-semibold">표로 보기</summary>
      {series.map((s) => <p key={s.label} className="mt-1"><b>{s.label}</b>: {s.points.map(([t, v]) => `${t}${axis.xUnit} ${v}${axis.yUnit}`).join(" · ")}</p>)}
    </details>
  );
}

/** ResponsiveContainer가 넘겨주는 width·height를 LineChart에 그대로 전한다 */
function Plot({ series, axis, dots, width, height }: { series: Series; axis: Axis; dots: boolean; width?: number; height?: number }) {
  return (
    <LineChart width={width} height={height} margin={{ top: 8, right: 16, bottom: 24, left: 4 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" dataKey="t" unit={axis.xUnit} allowDuplicatedCategory={false} label={{ value: `${axis.x} (${axis.xUnit})`, position: "insideBottom", offset: -10 }} />
      <YAxis type="number" dataKey="temp" unit={axis.yUnit} domain={["auto", "auto"]} />
      <Tooltip />
      <Legend verticalAlign="top" />
      {series.map((s, i) => <Line key={s.label} name={s.label} data={s.points.map(([t, temp]) => ({ t, temp }))} dataKey="temp" stroke={COLORS[i % COLORS.length]} dot={dots} isAnimationActive={false} />)}
    </LineChart>
  );
}

export default function SeriesChart({ series, title, axis }: { series: Series; title: string; axis?: Axis }) {
  if (series.length === 0) return null;
  const ax = axis ?? TIME_TEMP;
  return (
    <figure aria-label={`${title} ${ax.x}–${ax.y} 그래프`} className="rounded border border-line bg-white p-2">
      {axis ? <figcaption className="text-sm font-semibold">📈 {ax.x}에 따른 {ax.y}</figcaption> : null}
      <ResponsiveContainer width="100%" height={220}><Plot series={series} axis={ax} dots={Boolean(axis)} /></ResponsiveContainer>
      <Table series={series} axis={ax} />
    </figure>
  );
}
