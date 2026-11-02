"use client";
/**
 * 두 액체를 한 비커에 담은 모습 (밀도 결과) — 학생이 맞게 계산한 밀도로 아래(큰 값)·위(작은 값) 층을 그린다.
 * 정답값은 쓰지 않는다(규칙 3): 두 액체의 계산값을 모두 맞혀야 그림이 나타나고, 그 값으로 순서를 정한다.
 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { CalcEntry, RunRecord } from "@/components/lab/types";
import { fixJosa } from "@/lib/engine/format";

const COLOR: Record<string, { fill: string; stroke: string }> = {
  water: { fill: "#9fd3f7", stroke: "#3b82c4" },
  oil: { fill: "#f6d365", stroke: "#c9971c" },
};

interface Layer { id: string; label: string; density: number; shown: string }

/** 액체별 학생이 맞힌 밀도 값 */
function solved(catalog: AnyCatalog, run: RunRecord, calc: Record<string, CalcEntry>, liquids: string[]): Layer[] {
  return liquids.flatMap((id) => {
    const req = run.calcRequests.find((r) => r.subject === id && calc[r.key]?.correct);
    const label = catalog.items.find((i) => i.id === id)?.label ?? id;
    return req ? [{ id, label, density: Number(calc[req.key].value), shown: calc[req.key].value }] : [];
  });
}

/** 한 층 — 액체 띠, 수면 선, 이름표(이름·밀도) */
function Band({ l, y, each, W }: { l: Layer; y: number; each: number; W: number }) {
  const c = COLOR[l.id] ?? { fill: "#e2e8f0", stroke: "#64748b" };
  return (
    <g>
      <rect x="62" y={y} width={W - 4} height={each} fill={c.fill} />
      <line x1="62" x2={58 + W} y1={y} y2={y} stroke={c.stroke} strokeWidth="1.5" />
      <line x1={62 + W} x2="200" y1={y + each / 2} y2={y + each / 2} stroke="#475569" strokeDasharray="3 3" />
      <text x="206" y={y + each / 2 - 2} fontSize="14" fontWeight="700" fill="#1e293b">{l.label}</text>
      <text x="206" y={y + each / 2 + 14} fontSize="12" fill="#334155">{l.shown} g/mL</text>
    </g>
  );
}

function Beaker({ layers }: { layers: Layer[] }) {
  // 아래(밀도 큰 것)부터 쌓는다 — 같은 양씩
  const order = [...layers].sort((a, b) => b.density - a.density);
  const W = 120; const H = 140; const top = 30; const each = 45;
  return (
    <svg viewBox="0 0 300 190" className="h-auto w-full max-w-[360px]" role="img" aria-label={`한 비커에 담으면 아래부터 ${order.map((l) => l.label).join(" → ")}`}>
      <rect x="0" y="176" width="300" height="14" rx="3" fill="#cbd5e1" />
      {order.map((l, i) => <Band key={l.id} l={l} y={top + H - each * (i + 1)} each={each} W={W} />)}
      <path d={`M56 ${top - 6} L60 ${top} L60 ${top + H} Q60 ${top + H + 6} 66 ${top + H + 6} L${54 + W} ${top + H + 6} Q${60 + W} ${top + H + 6} ${60 + W} ${top + H} L${60 + W} ${top} L${64 + W} ${top - 6}`} fill="none" stroke="#64748b" strokeWidth="3" strokeLinejoin="round" />
      <text x="20" y={top + H - 4} fontSize="11" fill="#475569">아래</text>
      <text x="20" y={top + 70 - each} fontSize="11" fill="#475569">위</text>
    </svg>
  );
}

/** 그림 + 한 줄 설명 — 밀도가 큰 액체는 아래, 작은 액체는 위 */
function Settled({ layers }: { layers: Layer[] }) {
  const big = [...layers].sort((a, b) => b.density - a.density)[0].label;
  const small = [...layers].sort((a, b) => a.density - b.density)[0].label;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-3">
      <Beaker layers={layers} />
      <p className="min-w-[180px] flex-1 text-sm leading-relaxed">밀도가 <b>큰</b> {fixJosa(`${big}은(는)`)} <b>아래</b>로, 밀도가 <b>작은</b> {fixJosa(`${small}은(는)`)} <b>위</b>로 가요.</p>
    </div>
  );
}

export default function LayerResult({ catalog, run, calc, liquids }: { catalog: AnyCatalog; run: RunRecord; calc: Record<string, CalcEntry>; liquids: string[] }) {
  const layers = solved(catalog, run, calc, liquids);
  const names = liquids.map((id) => catalog.items.find((i) => i.id === id)?.label ?? id).join("과 ");
  const ready = layers.length === liquids.length;
  return (
    <section aria-labelledby="layer-title" className="rounded-xl border-2 border-[#4c97ff] bg-[#f4f8ff] p-3">
      <h3 id="layer-title" className="font-bold text-nav">🫙 {fixJosa(`${names}을(를)`)} 한 비커에 담으면?</h3>
      {ready ? <Settled layers={layers} /> : <p className="mt-1 text-sm text-muted">표에서 {names}의 밀도를 모두 맞게 계산하면 한 비커에 담았을 때의 모습이 나타나요.</p>}
    </section>
  );
}
