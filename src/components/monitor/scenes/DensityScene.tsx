"use client";
/** 밀도 실험 장면 (SVG) — 전자저울·눈금실린더·비커. 수치는 이벤트에 실린 측정값만 표시한다. */
import type { SimEvent } from "@/lib/engine/types";
import type { DensityState } from "@/lib/engine/experiments/density/reducer";
import { CYL_MAX } from "@/lib/engine/experiments/density/reducer";

const LIQ_COLOR: Record<string, string> = { water: "#60a5fa", oil: "#facc15" };

function scaleText(ev: SimEvent | null): string {
  if (!ev) return "";
  if (ev.type === "zero") return "0.0 g";
  if (ev.type === "measureMass" && typeof ev.mass === "number") return `${ev.mass.toFixed(1)} g`;
  return "";
}

function Cylinder({ s }: { s: DensityState }) {
  const level = Math.min(1, s.cyl.volume / CYL_MAX);
  const h = 180 * level;
  const color = s.cyl.liquid ? LIQ_COLOR[s.cyl.liquid] : "transparent";
  return (
    <g transform="translate(200,40)" aria-label="눈금실린더">
      <rect x="0" y="0" width="44" height="190" rx="4" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      <rect x="2" y={188 - h} width="40" height={h} fill={color} opacity="0.85" />
      {[0, 25, 50, 75, 100].map((m) => <line key={m} x1="30" x2="44" y1={188 - (180 * m) / CYL_MAX} y2={188 - (180 * m) / CYL_MAX} stroke="#334155" />)}
      {s.cyl.solids.map((id, i) => <rect key={id} x={8 + i * 14} y={170} width={id === "iron_big" ? 14 : 9} height={id === "iron_big" ? 14 : 9} fill="#374151" />)}
      <text x="22" y="210" textAnchor="middle" fontSize="12" fill="#0f172a">눈금실린더</text>
    </g>
  );
}

function Beaker({ s }: { s: DensityState }) {
  if (!s.shown.bkr) return null;
  const h = Math.min(1, s.bkr.volume / 250) * 90;
  const color = s.bkr.liquid ? LIQ_COLOR[s.bkr.liquid] : "transparent";
  return (
    <g transform="translate(320,120)" aria-label="비커">
      <rect x="0" y="0" width="80" height="100" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      <rect x="2" y={98 - h} width="76" height={h} fill={color} opacity="0.85" />
      <text x="40" y="118" textAnchor="middle" fontSize="12" fill="#0f172a">비커</text>
    </g>
  );
}

function Scale({ s, ev }: { s: DensityState; ev: SimEvent | null }) {
  if (!s.shown.scale) return null;
  return (
    <g transform="translate(40,170)" aria-label="전자저울">
      <rect x="0" y="40" width="130" height="30" rx="6" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
      <rect x="25" y="47" width="80" height="18" rx="3" fill="#0f172a" />
      <text x="65" y="61" textAnchor="middle" fontSize="13" fill="#4ade80" fontFamily="monospace">{scaleText(ev)}</text>
      {s.scaleSolid ? <rect x="55" y="22" width="18" height="18" fill="#374151" /> : null}
      <text x="65" y="88" textAnchor="middle" fontSize="12" fill="#0f172a">전자저울</text>
    </g>
  );
}

export default function DensityScene({ state, event }: { state: DensityState | null; event: SimEvent | null }) {
  if (!state) return null;
  return (
    <svg viewBox="0 0 440 270" className="h-full w-full" role="img" aria-label={event?.note ?? "실험 장치"}>
      <Scale s={state} ev={event} />
      <Cylinder s={state} />
      <Beaker s={state} />
    </svg>
  );
}
