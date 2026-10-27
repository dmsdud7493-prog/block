"use client";
/** 혼합물 분리 2(재결정) 장면 — 비커(녹은/안 녹은/결정)·얼음물 중탕·거름 장치·저울 (plan S8). 양은 서버 장면 값만 쓴다 */
import type { SimEvent } from "@/lib/engine/types";
import type { Separation2State } from "@/lib/engine/experiments/separation2/model";
import { TempBadge, Vessel } from "./parts";

const total = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0);

function BeakerView({ s }: { s: Separation2State }) {
  const b = s.bkr;
  const blue = b.dis.cuso4 > 0;
  const xtal = Math.min(18, total(b.xtal) * 1.5);
  const undis = Math.min(14, total(b.undis) * 1.5);
  return (
    <Vessel x={60} y={90} w={100} h={110} level={Math.min(1, b.water / 150)} color={blue ? "#7dd3fc" : "#e0f2fe"} label="비커">
      {undis > 0 ? <rect x="6" y={104 - undis} width="88" height={undis} fill="#cbd5e1" aria-label="녹지 않은 가루" /> : null}
      {xtal > 0 ? <text x="50" y={100 - undis} textAnchor="middle" fontSize={10 + xtal / 2} aria-label="결정">✦✦✦</text> : null}
    </Vessel>
  );
}

function FilterView({ s }: { s: Separation2State }) {
  if (!s.shown.filter) return null;
  const onPaper = total(s.filter.paper);
  return (
    <g transform="translate(250,60)" aria-label={`거름 장치${onPaper > 0 ? ", 거름종이 위에 결정" : ""}`}>
      <path d="M0 0 L70 0 L40 50 L40 80 L30 80 L30 50 Z" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      {onPaper > 0 ? <text x="35" y="22" textAnchor="middle" fontSize="12">✦✦</text> : null}
      <Vessel x={10} y={90} w={50} h={60} level={s.filter.done ? Math.min(1, s.filter.fw / 120) : 0} color={s.filter.fdis.cuso4 > 0 ? "#7dd3fc" : "#e0f2fe"} label="걸러진 용액" />
    </g>
  );
}

export default function Separation2Scene({ state, event }: { state: Separation2State | null; event: SimEvent | null }) {
  if (!state) return null;
  return (
    <svg viewBox="0 0 440 270" className="h-full w-full" role="img" aria-label={event?.note ?? "재결정 실험 장치"}>
      {state.shown.bath ? <Vessel x={40} y={150} w={140} h={70} level={0.6} color="#bae6fd" label={state.inBath ? "얼음물 (식히는 중)" : "얼음물"} /> : null}
      <BeakerView s={state} />
      <FilterView s={state} />
      <TempBadge x={330} y={20} temp={state.thermo ? state.bkr.T : null} />
      {state.shown.scale && state.weighed !== null ? <text x="378" y="240" textAnchor="middle" fontSize="13">저울 {state.weighed.toFixed(1)} g</text> : null}
    </svg>
  );
}
