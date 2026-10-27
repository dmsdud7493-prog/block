"use client";
/** 용해도 장면 — 시험관 A·B·C(물·녹은 양·바닥에 남은 고체·온도), 전자저울과 약포지 (plan S8). 녹은 양은 이벤트 수치만 표시 */
import type { SimEvent } from "@/lib/engine/types";
import { TUBES, type SolubilityState } from "@/lib/engine/experiments/solubility/model";
import { Vessel } from "./parts";

const SOLUTE_COLOR: Record<string, string> = { kno3: "#e0f2fe", cuso4: "#38bdf8", nacl: "#f1f5f9" };
const BATH_LABEL: Record<string, string> = { hot_water: "뜨거운 물", ice_water: "얼음물" };

interface TubeScene { id: string; solid: number; colorIntensity?: number }

/** 서버가 계산해 이벤트에 실어 보낸 장면 정보(바닥에 남은 고체 g)만 쓴다 — 물성은 클라이언트에 없다(ADR-P04) */
function solidOf(event: SimEvent | null, id: string): number {
  const scene = event?.scene as { tubes?: TubeScene[] } | undefined;
  return scene?.tubes?.find((t) => t.id === id)?.solid ?? 0;
}

function TubeView({ id, s, i, event }: { id: (typeof TUBES)[number]; s: SolubilityState; i: number; event: SimEvent | null }) {
  const t = s.tubes[id];
  const shown = s.shown[id];
  if (!shown) return null;
  const name = `시험관 ${id.slice(-1).toUpperCase()}`;
  const color = t.solute ? SOLUTE_COLOR[t.solute] ?? "#e2e8f0" : "#bfdbfe";
  const solidLeft = Math.min(14, solidOf(event, id) * 4);
  return (
    <Vessel x={60 + i * 110} y={50} w={34} h={140} level={Math.min(1, t.water / 20)} color={color} label={`${name} · ${t.temp}℃`}>
      {solidLeft > 0 ? <rect x="4" y={134 - solidLeft / 2} width="26" height={solidLeft / 2} fill="#94a3b8" aria-label="바닥에 남은 고체" /> : null}
      {t.crystal ? <text x="17" y="70" textAnchor="middle" fontSize="16" aria-label="결정이 생김">❄</text> : null}
      {t.bath ? <text x="17" y="-6" textAnchor="middle" fontSize="10" fill="#0f172a">{BATH_LABEL[t.bath] ?? t.bath}</text> : null}
    </Vessel>
  );
}

function Scale({ reading }: { reading: string }) {
  return (
    <g transform="translate(300,218)" aria-label={`전자저울 ${reading}`}>
      <rect x="0" y="0" width="120" height="26" rx="5" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
      <rect x="20" y="5" width="80" height="16" rx="3" fill="#0f172a" />
      <text x="60" y="18" textAnchor="middle" fontSize="12" fill="#4ade80" fontFamily="monospace">{reading}</text>
    </g>
  );
}

export default function SolubilityScene({ state, event }: { state: SolubilityState | null; event: SimEvent | null }) {
  if (!state) return null;
  const reading = state.paperOnScale ? `${state.paper.amt.toFixed(2)} g` : "0.00 g";
  return (
    <svg viewBox="0 0 440 270" className="h-full w-full" role="img" aria-label={event?.note ?? "용해도 실험 장치"}>
      {TUBES.map((id, i) => <TubeView key={id} id={id} s={state} i={i} event={event} />)}
      {state.shown.scale ? <Scale reading={reading} /> : null}
    </svg>
  );
}
