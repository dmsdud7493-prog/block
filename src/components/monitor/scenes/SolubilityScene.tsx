"use client";
/**
 * 용해도 장면 — 시험관대에 꽂힌 시험관 A·B·C, 전자저울 위 시약포지, 뜨거운 물/얼음물 중탕 비커.
 * 녹으면 용액 색이 진해지고(황산 구리(II)는 파랗게), 다 녹지 않은 고체는 바닥에 쌓이며,
 * 식히면 결정이 반짝이며 생긴다. 녹은 양·남은 고체는 서버가 이벤트에 실어 보낸 값만 쓴다(ADR-P04).
 */
import type { SimEvent } from "@/lib/engine/types";
import { TUBES, type SolubilityState } from "@/lib/engine/experiments/solubility/model";
import { BENCH_Y, Bench, LabDefs, LiquidDefs, VIEW_H, VIEW_W } from "./kit/defs";
import { Beaker, Label, TestTube } from "./kit/glass";
import { IceBath } from "./kit/heat";
import { Scale } from "./kit/instruments";
import { Crystals, PourStream, Powder, Steam } from "./kit/effects";
import { GripHand, PouringHand, PressHand, SpatulaHand } from "./kit/hand";

const SOLUTE_LIQ: Record<string, string> = { kno3: "kno3", cuso4: "cuso4", nacl: "nacl" };
const POWDER: Record<string, string> = { kno3: "#f8fafc", cuso4: "#3b82f6", nacl: "#ffffff" };
const TUBE = { w: 24, h: 112 };
const RACK = { x: 22, w: 210, top: BENCH_Y - 64 };
const tubeX = (i: number) => RACK.x + 34 + i * 66;

interface TubeScene { id: string; solid: number; colorIntensity?: number }

/** 용액 색 — 황산 구리(II)는 녹은 양(이벤트의 colorIntensity)에 따라 연한 파랑 → 진한 파랑 */
function liquidOf(solute: string | null, water: number, info?: TubeScene): string | null {
  if (water <= 0) return null;
  if (solute !== "cuso4") return solute ? SOLUTE_LIQ[solute] ?? "water" : "water";
  const k = info?.colorIntensity ?? 0;
  return k > 0.55 ? "cuso4" : k > 0.12 ? "cuso4_light" : "water";
}

/** 서버가 계산해 이벤트에 실어 보낸 장면 정보(바닥에 남은 고체 g)만 쓴다 — 물성은 클라이언트에 없다(ADR-P04) */
function sceneOf(event: SimEvent | null, id: string): TubeScene | undefined {
  const scene = event?.scene as { tubes?: TubeScene[] } | undefined;
  return scene?.tubes?.find((t) => t.id === id);
}

function Rack() {
  return (
    <g data-part="시험관대">
      <rect x={RACK.x} y={RACK.top} width={RACK.w} height="10" rx="3" fill="#e2e8f0" stroke="#94a3b8" />
      <rect x={RACK.x + 4} y={RACK.top + 10} width="8" height={BENCH_Y - RACK.top - 10} fill="#cbd5e1" />
      <rect x={RACK.x + RACK.w - 12} y={RACK.top + 10} width="8" height={BENCH_Y - RACK.top - 10} fill="#cbd5e1" />
      <rect x={RACK.x} y={BENCH_Y - 8} width={RACK.w} height="8" rx="2" fill="#e2e8f0" stroke="#94a3b8" />
    </g>
  );
}

function BathAround({ bath, x }: { bath: string; x: number }) {
  const w = 54;
  const h = 70;
  const bx = x + TUBE.w / 2 - w / 2;
  if (bath === "ice_water") return <IceBath x={bx} y={BENCH_Y - h} w={w} h={h} label="얼음물" />;
  return (
    <g>
      <Beaker x={bx} y={BENCH_Y - h} w={w} h={h} level={0.75} liquid="hot_water" label="뜨거운 물" />
      <Steam cx={bx + w / 2} y={BENCH_Y - h - 6} w={w} strength={0.6} />
    </g>
  );
}

function TubeInside({ solute, crystal, solidH }: { solute: string | null; crystal: boolean; solidH: number }) {
  return (
    <g>
      <Powder x={2} y={TUBE.h - 2} w={TUBE.w - 4} h={solidH} color={solute ? POWDER[solute] : "#e5e7eb"} />
      {crystal ? <Crystals x={3} y={TUBE.h - 6 - solidH} w={TUBE.w - 6} amount={0.8} color={solute === "cuso4" ? "#60a5fa" : "#ffffff"} /> : null}
    </g>
  );
}

/** 이 시험관에서 일어나는 손동작 — 물 붓기·용질 넣기·중탕에 넣기 */
function TubeHands({ id, ev, level, solute }: { id: string; ev: SimEvent | null; level: number; solute: string | null }) {
  if (!ev || ev.tube !== id) return null;
  if (ev.type === "pour") {
    return (
      <g key={ev.note}>
        <PourStream key={ev?.note} x={TUBE.w / 2} y1={-22} y2={4 + (TUBE.h - 4) * (1 - level)} />
        <PouringHand sx={TUBE.w / 2} sy={-22} />
      </g>
    );
  }
  if (ev.type === "add") return <SpatulaHand key={ev.note} x={TUBE.w / 2} y={-4} color={solute ? POWDER[solute] : undefined} />;
  if (ev.type === "bath") return <GripHand key={ev.note} x={TUBE.w} y={30} />;
  return null;
}

function TubeView({ id, s, i, event }: { id: (typeof TUBES)[number]; s: SolubilityState; i: number; event: SimEvent | null }) {
  const t = s.tubes[id];
  if (!s.shown[id]) return null;
  const name = `시험관 ${id.slice(-1).toUpperCase()}`;
  const info = sceneOf(event, id);
  const x = tubeX(i);
  const y = t.bath ? BENCH_Y - 70 - TUBE.h + 52 : RACK.top - TUBE.h + 50;
  const level = Math.min(0.62, t.water / 32);
  const solidH = Math.min(14, (info?.solid ?? 0) * 3);
  return (
    <g>
      {t.bath ? <BathAround bath={t.bath} x={x} /> : null}
      <g className="lab-move" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <TestTube x={0} y={0} w={TUBE.w} h={TUBE.h} level={level} liquid={liquidOf(t.solute, t.water, info)} label="" inside={<TubeInside solute={t.solute} crystal={t.crystal} solidH={solidH} />} />
        <TubeHands id={id} ev={event} level={level} solute={t.solute} />
      </g>
      <Label x={x + TUBE.w / 2} y={BENCH_Y + 16} text={`${name.slice(-1)} · ${t.temp}℃`} />
      <title>{name}</title>
    </g>
  );
}

function ScaleView({ s, ev }: { s: SolubilityState; ev: SimEvent | null }) {
  if (!s.shown.scale) return null;
  const reading = s.paperOnScale ? `${s.paper.amt.toFixed(2)} g` : "0.00 g";
  const pile = Math.min(9, s.paper.amt * 1.6);
  return (
    <Scale x={262} w={160} reading={reading} label="전자저울">
      {s.paperOnScale ? <path d="M-34 0 L34 0 L26 -4 L-26 -4 Z" fill="#ffffff" stroke="#cbd5e1" data-part="시약포지" /> : null}
      {s.paperOnScale && pile > 0 ? <Powder x={-14} y={-4} w={28} h={pile} color={s.paper.sub ? POWDER[s.paper.sub] : "#e5e7eb"} /> : null}
      {ev?.type === "zero" ? <PressHand key={ev.note} x={37} y={22} /> : null}
      {ev?.type === "scoop" ? <SpatulaHand key={ev.note} x={0} y={-6} color={s.paper.sub ? POWDER[s.paper.sub] : undefined} /> : null}
    </Scale>
  );
}

export default function SolubilityScene({ state, event }: { state: SolubilityState | null; event: SimEvent | null }) {
  if (!state) return null;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label={event?.note ?? "용해도 실험 장치"}>
      <LabDefs />
      <LiquidDefs keys={["water", "hot_water", "ice_water", "kno3", "cuso4", "cuso4_light", "nacl"]} />
      <Bench />
      {state.shown.tube_a || state.shown.tube_b || state.shown.tube_c ? <Rack /> : null}
      {TUBES.map((id, i) => <TubeView key={id} id={id} s={state} i={i} event={event} />)}
      <ScaleView s={state} ev={event} />
    </svg>
  );
}
