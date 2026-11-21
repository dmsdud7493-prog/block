/**
 * 보고서 자료를 보여 줄 때 다듬기 (2026-11-21) — 저장된 내용은 바꾸지 않고 화면·인쇄에서만.
 * 1) 번호: 예전 보고서는 실행 속 시험관 차례(2, 3, 5)가 그대로 찍혔다 → 표마다 1, 2, 3으로.
 * 2) 용해도 곡선: 표에 '온도'와 '물 100 g에 녹는 양'(학생이 맞힌 값)이 두 온도 넘게 있으면 온도–용해도 곡선을 그린다.
 */
import type { ReportContent } from "./template";

type DataItem = ReportContent["data"][number];

function renumber(d: DataItem): DataItem {
  if (d.columns[0] !== "번호") return d;
  const order = [...new Set(d.rows.map((r) => r[0]))];
  if (!order.every((v) => /^\d+$/.test(v))) return d;
  return { ...d, rows: d.rows.map((r) => [String(order.indexOf(r[0]) + 1), ...r.slice(1)]) };
}

const num = (v: string | undefined) => (v !== undefined && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : null);

function curve(d: DataItem): Pick<DataItem, "series" | "axis"> | null {
  const tCol = d.columns.findIndex((c) => c.startsWith("온도("));
  const sCol = d.columns.findIndex((c) => c.startsWith("물 100 g에 녹는 양("));
  const who = d.columns.indexOf("물질");
  if (tCol < 0 || sCol < 0 || who < 0) return null;
  const names = [...new Set(d.rows.map((r) => r[who]))];
  const series = names.map((label) => ({
    label,
    points: d.rows.filter((r) => r[who] === label).flatMap((r): [number, number][] => {
      const [t, s] = [num(r[tCol]), num(r[sCol])];
      return t === null || s === null ? [] : [[t, s]];
    }).sort((a, b) => a[0] - b[0]),
  })).filter((s) => new Set(s.points.map((p) => p[0])).size >= 2);
  return series.length ? { series: series.slice(0, 6), axis: { x: "물의 온도", xUnit: "℃", y: "물 100 g에 녹는 양(용해도)", yUnit: "g" } } : null;
}

export function deriveData(d: DataItem): DataItem {
  const fixed = renumber(d);
  return { ...fixed, ...(curve(fixed) ?? {}) };
}
