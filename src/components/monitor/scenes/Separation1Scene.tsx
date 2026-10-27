"use client";
/** 혼합물 분리 1(증류) 장면 — 가지 달린 삼각 플라스크·끓임쪽·가지 온도계·고무관·얼음물 속 시험관 (plan S8) */
import type { SimEvent } from "@/lib/engine/types";
import type { Separation1State } from "@/lib/engine/experiments/separation1/model";
import { Bubbles, HotPlate, TempBadge, Vessel } from "./parts";

function Flask({ s }: { s: Separation1State }) {
  const total = s.flask.water + s.flask.ethanol;
  const top = 118 - Math.min(60, total * 1.2);
  const half = 10 + (30 * (top - 40)) / 78;
  return (
    <g transform="translate(110,90)" aria-label={`가지 달린 삼각 플라스크, 물 ${s.flask.water} mL·에탄올 ${s.flask.ethanol} mL`}>
      <path d="M30 0 L50 0 L50 40 L80 118 L0 118 L30 40 Z" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      {total > 0 ? <path d={`M${40 - half} ${top} L${40 + half} ${top} L78 116 L2 116 Z`} fill="#a5b4fc" opacity="0.7" /> : null}
      {s.heating && total > 0 ? <Bubbles x={20} y={112} w={40} n={6} /> : null}
      {s.flask.chips > 0 ? <text x="40" y="114" textAnchor="middle" fontSize="9">▴▴▴</text> : null}
      <line x1="50" y1="18" x2="110" y2="30" stroke="#334155" strokeWidth="4" aria-label="가지" />
      {s.vapour ? <text x="80" y="14" fontSize="12" fill="#6366f1">〰 기체</text> : null}
      <text x="40" y="134" textAnchor="middle" fontSize="11">플라스크</text>
    </g>
  );
}

export default function Separation1Scene({ state, event }: { state: Separation1State | null; event: SimEvent | null }) {
  if (!state) return null;
  const branch = state.thermo.position === "branch";
  return (
    <svg viewBox="0 0 440 270" className="h-full w-full" role="img" aria-label={event?.note ?? "증류 실험 장치"}>
      <Flask s={state} />
      <HotPlate x={90} y={212} on={state.heating} />
      {state.flask.hose ? <path d="M220 120 C 260 120, 280 150, 300 170" fill="none" stroke="#475569" strokeWidth="4" /> : null}
      <Vessel x={270} y={160} w={90} h={60} level={0.75} color="#e0f2fe" label="얼음물" />
      <Vessel x={300} y={130} w={24} h={80} level={Math.min(1, state.etube.collected / 25)} color="#c4b5fd" label="" />
      <TempBadge x={20} y={20} temp={state.thermo.adjusted ? state.temp : null} label={branch ? "가지 부분 온도" : "온도계"} />
      <text x="320" y="245" textAnchor="middle" fontSize="11">모인 액체 {state.etube.collected.toFixed(1)} mL</text>
    </svg>
  );
}
