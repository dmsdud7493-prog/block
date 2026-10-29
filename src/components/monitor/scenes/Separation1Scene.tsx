"use client";
/**
 * 혼합물 분리 1(증류) 장면 — 핫플레이트 위 가지 달린 삼각 플라스크(물+에탄올, 끓임쪽), 온도계 꽂은 고무마개,
 * 가지 → 고무관 → 유리관 → 얼음물 속 시험관. 끓으면 기포가 오르고 목에 김이 차며, 식은 액체가 시험관에 똑똑 모인다.
 * 온도계 끝은 고른 위치(가지 갈라지는 부분·용액 속·바닥)로 내려간다. 수치는 상태에 실린 값만 쓴다.
 */
import type { SimEvent } from "@/lib/engine/types";
import type { Separation1State } from "@/lib/engine/experiments/separation1/model";
import { BENCH_Y, Bench, FloorShadow, LabDefs, LiquidDefs, VIEW_H, VIEW_W } from "./kit/defs";
import { Flask, Label, TestTube } from "./kit/glass";
import { HotPlate, IceBath, Stand, knobOf } from "./kit/heat";
import { Readout, RubberTube, Stopper, Thermometer } from "./kit/instruments";
import { BoilingChips, Bubbles, Drips } from "./kit/effects";
import { PinchHand, PourWithHand, PressHand, TweezerHand } from "./kit/hand";

const PLATE = { x: 50, w: 150, top: BENCH_Y - 30 };
const FL = { w: 112, h: 130, x: PLATE.x + 19 };
const FL_Y = PLATE.top - 130;
const NECK = { x: FL.x + FL.w / 2, top: FL_Y };
const ARM_END = { x: FL.x + FL.w + 26, y: FL_Y + 130 * 0.36 * 0.3 + 14 };
const COLD = { x: 300, w: 106, h: 84 };
const ET = { x: COLD.x + 43, w: 20, h: 92, y: BENCH_Y - 84 - 26 };

/** 온도계 끝 높이(플라스크 기준) — 가지 갈라지는 부분 / 용액 속 / 바닥 */
const TIP: Record<string, number> = { branch: 130 * 0.36 * 0.3 + 6, in_solution: 130 * 0.78, flask_bottom: 130 - 8 };

function FlaskInside({ s, level, strength }: { s: Separation1State; level: number; strength: number }) {
  return (
    <g>
      <Bubbles x={10} y={FL.h - 6} w={FL.w - 20} rise={FL.h * level} strength={strength} />
      {s.flask.chips > 0 ? <BoilingChips x={FL.w * 0.25} y={FL.h - 3} w={FL.w * 0.5} /> : null}
      {s.vapour ? <rect className="lab-glint" x={FL.w * 0.38} y="0" width={FL.w * 0.24} height={FL.h * 0.36} fill="#ffffff" opacity="0.35" /> : null}
    </g>
  );
}

function FlaskView({ s }: { s: Separation1State }) {
  const total = s.flask.water + s.flask.ethanol;
  const level = Math.min(0.6, total / 160);
  const liquid = s.flask.ethanol > 0 && s.flask.water > 0 ? "mixture" : s.flask.ethanol > 0 ? "ethanol" : "water";
  const strength = s.heating && total > 0 ? (s.vapour ? 0.75 : 0.18) : 0;
  return (
    <g>
      {s.flask.onHot ? null : <FloorShadow cx={FL.x + FL.w / 2} w={FL.w} />}
      <Flask x={FL.x} y={s.flask.onHot ? FL_Y : BENCH_Y - FL.h} w={FL.w} h={FL.h} level={total > 0 ? level : 0} liquid={liquid} sideArm labelLeft={s.flask.onHot} label="삼각 플라스크"
        inside={<FlaskInside s={s} level={level} strength={strength} />} />
    </g>
  );
}

function ThermoView({ s }: { s: Separation1State }) {
  if (!s.flask.stopper) return null;
  const tip = TIP[s.thermo.position ?? "branch"] ?? TIP.branch;
  const top = FL_Y - 58;
  return (
    <g>
      <Stopper x={NECK.x} y={FL_Y - 6} w={FL.w * 0.24} />
      {s.thermo.adjusted || s.thermo.position ? <Thermometer x={NECK.x} top={top} len={tip + 58} temp={s.thermo.adjusted ? s.temp : null} min={0} max={110} /> : null}
    </g>
  );
}

function Condenser({ s }: { s: Separation1State }) {
  const dripping = s.vapour && s.flask.hose && s.heating;
  return (
    <g>
      <IceBath x={COLD.x} y={BENCH_Y - COLD.h} w={COLD.w} h={COLD.h} label="얼음물" />
      <TestTube x={ET.x} y={ET.y} w={ET.w} h={ET.h} level={Math.min(0.9, s.etube.collected / 25)} liquid="ethanol" label="" />
      {s.flask.hose ? <RubberTube d={`M${ARM_END.x} ${ARM_END.y} C ${ARM_END.x + 50} ${ARM_END.y - 10}, ${ET.x - 30} ${ET.y - 40}, ${ET.x + ET.w / 2} ${ET.y - 12}`} /> : null}
      {s.flask.glassIn ? <rect x={ET.x + ET.w / 2 - 2} y={ET.y - 14} width="4" height="44" rx="2" fill="#e6f0ff" stroke="#94a3b8" /> : null}
      {dripping ? <Drips x={ET.x + ET.w / 2} y={ET.y + 30} fall={ET.h * 0.45} /> : null}
      <Label x={ET.x + ET.w / 2} y={BENCH_Y + 16} text={`모인 액체 ${s.etube.collected.toFixed(1)} mL`} />
    </g>
  );
}

/** 단계별 손동작 — 붓기·끓임쪽 넣기·마개·온도계 높이·가열·관 연결 */
function Hands({ s, ev }: { s: Separation1State; ev: SimEvent | null }) {
  if (!ev) return null;
  const top = s.flask.onHot ? FL_Y : BENCH_Y - FL.h;
  const k = ev.note;
  switch (ev.type) {
    case "pour":
      return <PourWithHand key={k} x={NECK.x} y1={top - 22} y2={top + FL.h * 0.7} color="#c9bdf5" liquid={s.flask.ethanol > 0 ? "ethanol" : "water"} />;
    case "chips": return <TweezerHand key={k} x={NECK.x - 2} y={top - 4} tip={<BoilingChips x={-6} y={2} w={12} />} />;
    case "stopper": return <PinchHand key={k} x={NECK.x} y={top - 4} />;
    case "adjust": return <PinchHand key={k} x={NECK.x} y={top - 40} />;
    case "heat":
    case "stopHeat": return <PressHand key={k} {...knobOf(PLATE.x, PLATE.top, PLATE.w)} />;
    case "connect": return <PinchHand key={k} x={ARM_END.x + 4} y={ARM_END.y} />;
    case "insertGlass": return <PinchHand key={k} x={ET.x + ET.w / 2} y={ET.y - 10} />;
    default: return null;
  }
}

export default function Separation1Scene({ state, event }: { state: Separation1State | null; event: SimEvent | null }) {
  if (!state) return null;
  const branch = state.thermo.position === "branch";
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label={event?.note ?? "증류 실험 장치"}>
      <LabDefs />
      <LiquidDefs keys={["water", "ethanol", "mixture", "ice_water"]} />
      <Bench />
      <Stand x={26} top={14} armX={NECK.x} armY={FL_Y + 10} />
      {state.flask.onHot || state.heating ? <HotPlate x={PLATE.x} y={PLATE.top} w={PLATE.w} on={state.heating} /> : null}
      <FlaskView s={state} />
      <ThermoView s={state} />
      <Condenser s={state} />
      <Hands s={state} ev={event} />
      <Readout x={330} y={36} value={state.thermo.adjusted ? state.temp : null} label={branch ? "가지 부분 온도" : "온도계"} />
    </svg>
  );
}
