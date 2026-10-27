"use client";
/** 끓는점 측정 장면 — 직접 가열(비커) / 물중탕(가지 시험관·고무관·찬물 속 빈 시험관) (plan S8) */
import type { SimEvent } from "@/lib/engine/types";
import type { BoilingState } from "@/lib/engine/experiments/boiling/model";
import { Bubbles, HotPlate, LIQUID, TempBadge, Vessel } from "./parts";

function SideTube({ s }: { s: BoilingState }) {
  if (!s.shown.tube || !s.tube.liquid) return null;
  const level = Math.min(1, s.tube.volume / 30);
  return (
    <g>
      <Vessel x={150} y={70} w={28} h={120} level={level} color={LIQUID[s.tube.liquid] ?? "#cbd5e1"} label="가지 시험관">
        {s.bubbles > 0.05 ? <Bubbles x={6} y={110} w={16} n={Math.round(s.bubbles * 8)} /> : null}
      </Vessel>
      {s.tube.hose ? <path d="M178 90 C 230 80, 250 120, 290 150" fill="none" stroke="#475569" strokeWidth="4" /> : null}
    </g>
  );
}

function Collector({ s }: { s: BoilingState }) {
  if (!s.shown.etube && !s.shown.cold) return null;
  return (
    <g>
      {s.shown.cold ? <Vessel x={270} y={150} w={80} h={70} level={0.7} color="#bae6fd" label="찬물" /> : null}
      {s.shown.etube ? <Vessel x={295} y={120} w={22} h={80} level={Math.min(1, s.etube.collected / 10)} color="#c4b5fd" label="" /> : null}
    </g>
  );
}

export default function BoilingScene({ state, event }: { state: BoilingState | null; event: SimEvent | null }) {
  if (!state) return null;
  const bk = state.bkr;
  const level = bk.liquid ? Math.min(1, bk.volume / 200) : 0;
  const temp = state.thermo.where ? state.temp : null;
  return (
    <svg viewBox="0 0 440 270" className="h-full w-full" role="img" aria-label={event?.note ?? "끓는점 실험 장치"}>
      {state.shown.hot ? <HotPlate x={105} y={214} on={state.heating} /> : null}
      {state.shown.bkr ? <Vessel x={110} y={110} w={110} h={100} level={level} color={LIQUID[bk.liquid ?? ""] ?? "#93c5fd"} label={state.tube.liquid ? "물중탕 비커" : "비커"}>{!state.tube.liquid && state.bubbles > 0.05 ? <Bubbles x={10} y={90} w={90} n={Math.round(state.bubbles * 14)} /> : null}</Vessel> : null}
      <SideTube s={state} />
      <Collector s={state} />
      <TempBadge x={20} y={30} temp={temp} label={state.thermo.where === "tube" ? "시험관 속 온도" : "온도계"} />
    </svg>
  );
}
