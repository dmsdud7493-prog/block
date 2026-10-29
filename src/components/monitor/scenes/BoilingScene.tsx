"use client";
/**
 * 끓는점 측정 장면 — 직접 가열(핫플레이트 위 비커) 또는 물중탕(비커 속 가지 달린 시험관).
 * 물중탕일 때는 시험관 가지에서 고무관·유리관이 찬물 속 빈 시험관으로 이어져 식은 액체가 똑똑 모인다.
 * 끓으면 기포가 세차게 오르고 김이 피어오른다. 수치는 상태에 실린 값만 쓴다.
 */
import type { SimEvent } from "@/lib/engine/types";
import type { BoilingState } from "@/lib/engine/experiments/boiling/model";
import { BENCH_Y, Bench, FloorShadow, LabDefs, LiquidDefs, VIEW_H, VIEW_W } from "./kit/defs";
import { Beaker, Label, TestTube } from "./kit/glass";
import { HotPlate, IceBath, Stand, knobOf } from "./kit/heat";
import { Readout, RubberTube, Stopper, Thermometer } from "./kit/instruments";
import { Bubbles, Drips, PourStream, Steam } from "./kit/effects";
import { GripHand, PinchHand, PouringHand, PressHand } from "./kit/hand";

const PLATE = { x: 60, w: 150, top: BENCH_Y - 30 };
const BKR = { w: 118, h: 100, x: PLATE.x + 16 };
const TUBE = { w: 24, h: 124, x: PLATE.x + 64 };
const TUBE_Y = { fixed: PLATE.top - 14 - 124, held: 14 };
const COLD = { x: 300, w: 104, h: 84 };
const ETUBE = { x: COLD.x + 42, w: 20, h: 92 };

const LABEL: Record<string, string> = { water: "물", ethanol: "에탄올" };

const isThermo = (ev: SimEvent | null) => ev?.type === "fixThermo" || ev?.type === "adjust";

function BeakerView({ s, ev }: { s: BoilingState; ev: SimEvent | null }) {
  if (!s.shown.bkr) return null;
  const bk = s.bkr;
  const direct = !s.tube.liquid;
  const y = (bk.onHot || s.shown.hot ? PLATE.top : BENCH_Y) - BKR.h;
  // 적은 양(50 mL 이하)은 작은 비커(100 mL 눈금)로 보여 줘야 수면이 보인다
  const small = bk.volume > 0 && bk.volume <= 50;
  const cap = small ? 100 : 250;
  const level = bk.liquid ? Math.min(1, bk.volume / cap) : 0;
  const marks = small ? ["20", "40", "60", "80", ""] : ["50", "100", "150", "200", ""];
  const strength = s.heating ? (direct ? s.bubbles : Math.min(0.3, s.bubbles * 0.4 + 0.08)) : 0;
  return (
    <g className="lab-move" style={{ transform: `translate(${BKR.x}px, ${y}px)` }}>
      {bk.onHot || s.shown.hot ? null : <FloorShadow cx={BKR.w / 2} w={BKR.w + 6} y={BKR.h} />}
      <Beaker x={0} y={0} w={BKR.w} h={BKR.h} level={level} liquid={bk.liquid === "water" ? "hot_water" : bk.liquid} label={direct ? "비커" : "물중탕 비커"} labelLeft={bk.onHot || s.shown.hot} marks={marks}
        inside={<Bubbles x={6} y={BKR.h - 6} w={BKR.w - 12} rise={BKR.h * level * 0.85} strength={strength} />} />
      {direct && s.heating ? <Steam cx={BKR.w / 2} y={-8} w={BKR.w} strength={s.bubbles} /> : null}
      {direct && s.thermo.where === "bkr" ? <Thermometer x={BKR.w * 0.7} top={-70} len={BKR.h + 56} temp={s.temp} min={0} max={110} /> : null}
      {ev?.type === "pour" && ev.container === "beaker" ? <PourStream x={BKR.w / 2} y1={-22} y2={6 + (BKR.h - 6) * (1 - level)} /> : null}
      {ev?.type === "pour" && ev.container === "beaker" ? <PouringHand key={ev.note} sx={BKR.w / 2} sy={-22} /> : null}
      {ev?.type === "placeHot" ? <GripHand key={ev.note} x={BKR.w - 2} y={BKR.h * 0.45} /> : null}
      {direct && isThermo(ev) ? <PinchHand key={ev?.note} x={BKR.w * 0.7} y={-58} /> : null}
    </g>
  );
}

function SideTube({ s, ev }: { s: BoilingState; ev: SimEvent | null }) {
  if (!s.shown.tube || !s.tube.liquid) return null;
  const y = s.tube.fixed ? TUBE_Y.fixed : TUBE_Y.held;
  const level = Math.min(0.5, s.tube.volume / 40);
  return (
    <g className="lab-move" style={{ transform: `translate(${TUBE.x}px, ${y}px)` }}>
      <path d={`M${TUBE.w} 26 L${TUBE.w + 22} 38`} stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
      <path d={`M${TUBE.w} 26 L${TUBE.w + 22} 38`} stroke="#eef5ff" strokeWidth="2.5" strokeLinecap="round" />
      <TestTube x={0} y={0} w={TUBE.w} h={TUBE.h} level={level} liquid={s.tube.liquid} label=""
        inside={<Bubbles x={3} y={TUBE.h - 6} w={TUBE.w - 6} rise={TUBE.h * level * 0.8} strength={s.heating ? s.bubbles : 0} />} />
      {s.tube.stopper ? <Stopper x={TUBE.w / 2} y={-6} w={TUBE.w} /> : null}
      {s.thermo.where === "tube" ? <Thermometer x={TUBE.w / 2} top={-54} len={TUBE.h + 40} temp={s.temp} min={0} max={110} /> : null}
      <Label x={-28} y={TUBE.h - 16} text={LABEL[s.tube.liquid] ?? s.tube.liquid} />
      {ev?.type === "pour" && ev.container !== "beaker" ? <PourStream x={TUBE.w / 2} y1={-22} y2={TUBE.h * (1 - level)} color="#c9bdf5" /> : null}
      {ev?.type === "pour" && ev.container !== "beaker" ? <PouringHand key={ev.note} sx={TUBE.w / 2} sy={-22} liquid={s.tube.liquid} /> : null}
      {ev?.type === "fixTube" ? <GripHand key={ev.note} x={TUBE.w} y={48} /> : null}
      {ev?.type === "stopper" ? <PinchHand key={ev.note} x={TUBE.w / 2} y={-4} /> : null}
      {isThermo(ev) ? <PinchHand key={ev?.note} x={TUBE.w / 2} y={-42} /> : null}
    </g>
  );
}

function Collector({ s, ev }: { s: BoilingState; ev: SimEvent | null }) {
  if (!s.shown.cold && !s.shown.etube) return null;
  const etubeY = BENCH_Y - COLD.h - 26;
  const tubeTop = (s.tube.fixed ? TUBE_Y.fixed : TUBE_Y.held) + 38;
  const dripping = s.heating && s.tube.hose && s.bubbles > 0.3;
  return (
    <g>
      {s.shown.cold ? <IceBath x={COLD.x} y={BENCH_Y - COLD.h} w={COLD.w} h={COLD.h} label="찬물" /> : null}
      {s.shown.etube ? <TestTube x={ETUBE.x} y={etubeY} w={ETUBE.w} h={ETUBE.h} level={Math.min(1, s.etube.collected / 10)} liquid="ethanol" label="" /> : null}
      {s.tube.hose ? <RubberTube d={`M${TUBE.x + TUBE.w + 22} ${tubeTop} C ${TUBE.x + 120} ${tubeTop - 10}, ${ETUBE.x - 40} ${etubeY - 40}, ${ETUBE.x + ETUBE.w / 2} ${etubeY - 14}`} /> : null}
      {s.tube.glassIn ? <rect x={ETUBE.x + ETUBE.w / 2 - 2} y={etubeY - 16} width="4" height="40" rx="2" fill="#e6f0ff" stroke="#94a3b8" /> : null}
      {dripping ? <Drips x={ETUBE.x + ETUBE.w / 2} y={etubeY + 22} fall={ETUBE.h * 0.5} /> : null}
      {s.shown.etube ? <Label x={ETUBE.x + ETUBE.w / 2} y={BENCH_Y + 16} text={`모인 액체 ${s.etube.collected.toFixed(1)} mL`} /> : null}
      {ev?.type === "insertEtube" ? <GripHand key={ev.note} x={ETUBE.x + ETUBE.w} y={etubeY + 24} /> : null}
      {ev?.type === "insertGlass" ? <PinchHand key={ev.note} x={ETUBE.x + ETUBE.w / 2} y={etubeY - 12} /> : null}
    </g>
  );
}

export default function BoilingScene({ state, event }: { state: BoilingState | null; event: SimEvent | null }) {
  if (!state) return null;
  const temp = state.thermo.where ? state.temp : null;
  const armY = (state.tube.fixed ? TUBE_Y.fixed : TUBE_Y.held) + 12;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label={event?.note ?? "끓는점 실험 장치"}>
      <LabDefs />
      <LiquidDefs keys={["water", "hot_water", "ethanol", "ice_water"]} />
      <Bench />
      {state.shown.stand ? <Stand x={30} top={10} armX={TUBE.x + TUBE.w / 2} armY={armY} /> : null}
      {state.shown.hot ? <HotPlate x={PLATE.x} y={PLATE.top} w={PLATE.w} on={state.heating} /> : null}
      <BeakerView s={state} ev={event} />
      <SideTube s={state} ev={event} />
      <Collector s={state} ev={event} />
      {event?.type === "heat" ? <PressHand key={event.note} {...knobOf(PLATE.x, PLATE.top, PLATE.w)} /> : null}
      <Readout x={330} y={40} value={temp} label={state.thermo.where === "tube" ? "시험관 속 온도" : "온도계"} />
    </svg>
  );
}
