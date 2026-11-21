"use client";
/**
 * 용해도 실험 그래프 (plan S8) — 온도별로 "실제로 녹은 양"(내가 넣은 물 기준)을 물질마다 점·선으로 잇는다.
 * 물 100 g 기준 환산(용해도)은 학생이 계산하는 값이라 그래프에 그리지 않는다(지침 5.3 — solvent_basis 계산 기회 보존).
 */
import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { RunRecord } from "@/components/lab/types";
import { subjectLabel } from "@/lib/engine/subjectLabel";
import { bestSolubilityPoints } from "@/lib/report/solubility";

const COLORS = ["#1d4ed8", "#0e7490", "#b45309"];
const labelOf = subjectLabel;

export { dissolvedRecords, solubilityPoints } from "@/lib/report/solubility";

/** runs: 성공한 실행들 — 온도를 가장 여러 가지로 잰 실행의 점을 그린다 */
export default function SolubilityChart({ catalog, runs }: { catalog: AnyCatalog; runs: RunRecord[] }) {
  const groups = bestSolubilityPoints(runs);
  if (groups.length === 0) return <p className="text-sm text-muted">온도를 잰 기록이 있어야 그래프를 그릴 수 있어요.</p>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name="온도" unit="℃" domain={[0, 100]} label={{ value: "물의 온도 (℃)", position: "insideBottom", offset: -10 }} />
        <YAxis type="number" dataKey="y" name="녹은 양" unit=" g" label={{ value: "녹은 양 (g)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend verticalAlign="top" />
        {groups.map((g, i) => <Scatter key={g.subject} name={`${labelOf(catalog, g.subject)} (넣은 물 기준)`} data={g.points} fill={COLORS[i % COLORS.length]} line shape="circle" />)}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
