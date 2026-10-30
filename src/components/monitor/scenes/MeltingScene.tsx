"use client";
/**
 * 녹는점 측정 장면 — 핫플레이트 위 물중탕 비커, 스탠드 클램프에 고정한 시험관(고체 → 녹은 액체),
 * 시험관 속 유리 온도계와 디지털 표시창. 시험관을 고정하면 물속으로 내려가고, 가열하면 상판이 달아오르고
 * 물속에 잔기포가 생기며, 고체가 줄고 녹은 액체가 늘어난다. 수치는 상태에 실린 값만 쓴다.
 */
import type { SimEvent } from "@/lib/engine/types";
import type { MeltingState } from "@/lib/engine/experiments/melting/model";
import { BENCH_Y, Bench, FloorShadow, LabDefs, LiquidDefs, VIEW_H, VIEW_W } from "./kit/defs";
import { Beaker, Label, TestTube } from "./kit/glass";
import { HotPlate, Stand, knobOf } from "./kit/heat";
import { Readout, Thermometer } from "./kit/instruments";
import { Bubbles, PourStream } from "./kit/effects";
import { GripHand, PinchHand, PouringHand, PressHand } from "./kit/hand";

const SUB_LABEL: Record<string, string> = { lauric_acid: "로르산", palmitic_acid: "팔미트산" };
const PLATE = { x: 110, w: 150, top: BENCH_Y - 30 };
const BKR = { w: 116, h: 104 };
const TUBE = { w: 22, h: 118, x: PLATE.x + PLATE.w / 2 - 11 };
/** 시험관 높이: 고정하면 물중탕 속(바닥에서 10 위), 아니면 위에 들고 있다 */
const TUBE_Y = { fixed: PLATE.top - 12 - TUBE.h, held: 22 };

/** 시험관 속: 아래는 하얀 고체, 위는 녹은 투명한 액체 */
function TubeContents({ solid }: { solid: number }) {
  const fillH = 44;
  const bottom = TUBE.h - 2;
  const solidH = fillH * Math.max(0, Math.min(1, solid));
  return (
    <g>
      <rect className="lab-liquid" x="0" y={bottom - fillH} width={TUBE.w} height={fillH - solidH} fill="url(#lab-liq-melt)" />
      <rect className="lab-liquid" x="0" y={bottom - solidH} width={TUBE.w} height={solidH + 4} fill="#fbfaf5" />
      {solidH > 4 ? <path d={`M2 ${bottom - solidH + 3} l4 -2 l5 2 l4 -2 l5 2`} fill="none" stroke="#d6d3c4" strokeWidth="1" /> : null}
    </g>
  );
}

function TubeAssembly({ s, ev }: { s: MeltingState; ev: SimEvent | null }) {
  if (!s.shown.tube || !s.tube.sub) return null;
  const y = s.tube.fixed ? TUBE_Y.fixed : TUBE_Y.held;
  const melting = s.solid > 0 && s.solid < 1;
  return (
    <g className="lab-move" style={{ transform: `translate(${TUBE.x}px, ${y}px)` }}>
      <TestTube x={0} y={0} w={TUBE.w} h={TUBE.h} level={0} label="" inside={<TubeContents solid={s.solid} />} />
      {s.thermo.in ? <Thermometer x={TUBE.w / 2} top={-46} len={TUBE.h + 40} temp={s.temp} min={0} max={100} /> : null}
      <Label x={TUBE.w / 2 - 46} y={TUBE.h - 30} text={SUB_LABEL[s.tube.sub] ?? s.tube.sub} />
      {melting ? <Label x={TUBE.w / 2 + 52} y={TUBE.h - 30} text="녹는 중…" /> : null}
      {ev?.type === "fixTube" ? <GripHand key={ev.note} x={TUBE.w} y={34} /> : null}
      {ev?.type === "insertThermo" ? <PinchHand key={ev.note} x={TUBE.w / 2} y={-24} /> : null}
    </g>
  );
}

function BathBeaker({ s, ev }: { s: MeltingState; ev: SimEvent | null }) {
  if (!s.shown.bkr) return null;
  const onHot = s.bkr.onHot || s.shown.hot;
  const y = (onHot ? PLATE.top : BENCH_Y) - BKR.h;
  const level = s.bkr.water ? Math.min(1, s.bkr.volume / 250) : 0;
  const strength = s.heating && s.bkr.water ? Math.min(0.45, Math.max(0.1, ((s.temp ?? 20) - 25) / 120)) : 0;
  return (
    <g className="lab-move" style={{ transform: `translate(${PLATE.x + (PLATE.w - BKR.w) / 2}px, ${y}px)` }}>
      {onHot ? null : <FloorShadow cx={BKR.w / 2} w={BKR.w + 6} y={BKR.h} />}
      <Beaker x={0} y={0} w={BKR.w} h={BKR.h} level={level} liquid="hot_water" label="물중탕 비커" labelLeft={onHot} marks={["50", "100", "150", "200", ""]}
        inside={<Bubbles x={6} y={BKR.h - 6} w={BKR.w - 12} rise={BKR.h * 0.6 * level} strength={strength} />} />
      {ev?.type === "pour" ? <PourStream key={ev?.note} x={BKR.w * 0.78} y1={-22} y2={6 + (BKR.h - 6) * (1 - level)} /> : null}
      {ev?.type === "pour" ? <PouringHand key={ev.note} sx={BKR.w * 0.78} sy={-22} /> : null}
      {ev?.type === "placeHot" ? <GripHand key={ev.note} x={BKR.w - 2} y={BKR.h * 0.45} /> : null}
    </g>
  );
}

export default function MeltingScene({ state, event }: { state: MeltingState | null; event: SimEvent | null }) {
  if (!state) return null;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label={event?.note ?? "녹는점 실험 장치"}>
      <LabDefs />
      <LiquidDefs keys={["hot_water", "melt"]} />
      <Bench />
      {state.shown.stand ? <Stand x={56} top={20} armX={TUBE.x + TUBE.w / 2} armY={(state.tube.fixed ? TUBE_Y.fixed : TUBE_Y.held) + 14} /> : null}
      {state.shown.hot ? <HotPlate x={PLATE.x} y={PLATE.top} w={PLATE.w} on={state.heating} /> : null}
      <BathBeaker s={state} ev={event} />
      <TubeAssembly s={state} ev={event} />
      {event?.type === "heat" ? <PressHand key={event.note} {...knobOf(PLATE.x, PLATE.top, PLATE.w)} /> : null}
      <Readout x={320} y={44} value={state.thermo.in ? state.temp : null} label="시험관 속 온도" />
    </svg>
  );
}
