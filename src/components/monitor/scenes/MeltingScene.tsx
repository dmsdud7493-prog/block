"use client";
/** 녹는점 측정 장면 — 물중탕 비커·가열 장치·시험관(고체 비율)·온도계 (plan S8) */
import type { SimEvent } from "@/lib/engine/types";
import type { MeltingState } from "@/lib/engine/experiments/melting/model";
import { HotPlate, TempBadge, Vessel } from "./parts";

const SUB_LABEL: Record<string, string> = { lauric_acid: "로르산", palmitic_acid: "팔미트산" };

function Tube({ s }: { s: MeltingState }) {
  if (!s.shown.tube || !s.tube.sub) return null;
  const solidH = 40 * s.solid;
  const liquidH = 40 * (1 - s.solid);
  const y = s.tube.fixed ? 70 : 20;
  return (
    <g transform={`translate(160,${y})`} aria-label={`${SUB_LABEL[s.tube.sub] ?? s.tube.sub} 시험관, 고체 ${Math.round(s.solid * 100)}%`}>
      <rect x="0" y="0" width="26" height="110" rx="12" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      <rect x="3" y={104 - liquidH - solidH} width="20" height={liquidH} fill="#fde68a" opacity="0.8" />
      <rect x="3" y={104 - solidH} width="20" height={solidH} fill="#f8fafc" stroke="#cbd5e1" />
      {s.thermo.in ? <line x1="13" y1="-30" x2="13" y2="96" stroke="#dc2626" strokeWidth="3" /> : null}
      <text x="13" y="126" textAnchor="middle" fontSize="11" fill="#0f172a">{SUB_LABEL[s.tube.sub] ?? s.tube.sub}</text>
    </g>
  );
}

export default function MeltingScene({ state, event }: { state: MeltingState | null; event: SimEvent | null }) {
  if (!state) return null;
  const level = state.bkr.water ? Math.min(1, state.bkr.volume / 250) : 0;
  return (
    <svg viewBox="0 0 440 270" className="h-full w-full" role="img" aria-label={event?.note ?? "녹는점 실험 장치"}>
      {state.shown.hot ? <HotPlate x={115} y={214} on={state.heating} /> : null}
      {state.shown.bkr ? <Vessel x={120} y={100} w={110} h={110} level={level} color="#93c5fd" label="물중탕 비커" /> : null}
      <Tube s={state} />
      <TempBadge x={300} y={60} temp={state.thermo.in ? state.temp : null} />
      {state.solid > 0 && state.solid < 1 ? <text x="348" y="140" textAnchor="middle" fontSize="12" fill="#92400e">녹는 중…</text> : null}
    </svg>
  );
}
