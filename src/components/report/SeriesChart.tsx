"use client";
/** 보고서 자료의 시간–온도 그래프 — 보고서에 저장된 줄인 기록으로 그린다(학생·교사 화면 공용). 같은 값의 표는 접어서 함께 둔다 */
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReportContent } from "@/lib/report/template";

type Series = ReportContent["data"][number]["series"];
const COLORS = ["#1d4ed8", "#b45309", "#047857", "#7c3aed", "#be123c", "#0e7490"];

function Table({ series }: { series: Series }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold">표로 보기</summary>
      {series.map((s) => <p key={s.label} className="mt-1"><b>{s.label}</b>: {s.points.map(([t, v]) => `${t}초 ${v}℃`).join(" · ")}</p>)}
    </details>
  );
}

/** ResponsiveContainer가 넘겨주는 width·height를 LineChart에 그대로 전한다 */
function Plot({ series, width, height }: { series: Series; width?: number; height?: number }) {
  return (
    <LineChart width={width} height={height} margin={{ top: 8, right: 16, bottom: 24, left: 4 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" dataKey="t" unit="초" allowDuplicatedCategory={false} label={{ value: "시간 (초)", position: "insideBottom", offset: -10 }} />
      <YAxis type="number" dataKey="temp" unit="℃" domain={["auto", "auto"]} />
      <Tooltip />
      <Legend verticalAlign="top" />
      {series.map((s, i) => <Line key={s.label} name={s.label} data={s.points.map(([t, temp]) => ({ t, temp }))} dataKey="temp" stroke={COLORS[i % COLORS.length]} dot={false} isAnimationActive={false} />)}
    </LineChart>
  );
}

export default function SeriesChart({ series, title }: { series: Series; title: string }) {
  if (series.length === 0) return null;
  return (
    <figure aria-label={`${title} 시간–온도 그래프`} className="rounded border border-line bg-white p-2">
      <ResponsiveContainer width="100%" height={220}><Plot series={series} /></ResponsiveContainer>
      <Table series={series} />
    </figure>
  );
}
