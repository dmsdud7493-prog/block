"use client";
/**
 * 밀도 실험 장면 — 실험대 위 전자저울·눈금실린더·비커.
 * 저울에 올린 그릇은 저울 접시로 미끄러져 가고, 물을 부으면 줄기가 흐르며 수면이 차오르고,
 * 철조각을 넣으면 가라앉으며 수면이 올라간다. 수치는 이벤트에 실린 측정값만 표시한다.
 */
import type { SimEvent } from "@/lib/engine/types";
import type { DensityState } from "@/lib/engine/experiments/density/reducer";
import { BKR_MAX, CYL_MAX } from "@/lib/engine/experiments/density/reducer";
import { BENCH_Y, Bench, FloorShadow, LabDefs, LiquidDefs, VIEW_H, VIEW_W } from "./kit/defs";
import { Beaker, Cylinder, Liquid } from "./kit/glass";
import { Scale } from "./kit/instruments";
import { IronPiece } from "./kit/effects";
import { PourWithHand, PressHand, TweezerHand } from "./kit/hand";

const SOLID_LABEL: Record<string, string> = { iron_big: "큰 철조각", iron_small: "작은 철조각" };
const CYL = { w: 52, h: 150 };
const BKR = { w: 88, h: 100 };
/** 그릇 자리: 바닥 / 저울 접시 위 */
const SPOT = { cylFloor: 222, cylScale: 80, bkrFloor: 322, bkrScale: 58, scaleX: 14 };

/** 저울 표시 — 이번 단계 측정값, 아니면 저울 위 물체를 마지막으로 잰 값(측정 기록에 있는 값만) */
function scaleText(s: DensityState, ev: SimEvent | null): string {
  if (ev?.type === "zero") return "0.0 g";
  if (ev?.type === "measureMass" && typeof ev.mass === "number") return `${ev.mass.toFixed(1)} g`;
  const m = s.measured.mass;
  if (m && (s.scaleSolid === m.name || s.scale.item === m.name)) return `${m.value.toFixed(1)} g`;
  return s.scaleSolid || s.scale.item ? "--.- g" : "0.0 g";
}

const solidSize = (id: string) => (id === "iron_big" ? 16 : 10);

/** 눈금실린더 속 철조각 — 바닥에 가라앉아 있다 */
function SolidsInCylinder({ solids, ev }: { solids: string[]; ev: SimEvent | null }) {
  return (
    <g>
      {solids.map((id, i) => <g key={id} className={solidClass(ev, id, "cylinder")}><IronPiece x={6 + i * 15} y={CYL.h - 4 - solidSize(id) * 1.3} s={solidSize(id)} label={SOLID_LABEL[id]} /></g>)}
    </g>
  );
}

/** 눈금을 읽는 눈높이 선 — 부피를 재는 단계에서만 */
function EyeLine({ y }: { y: number }) {
  return (
    <g aria-hidden="true">
      <line x1="-30" x2={CYL.w + 30} y1={y} y2={y} stroke="#2563eb" strokeWidth="1.2" strokeDasharray="4 3" />
      <text x={CYL.w + 32} y={y + 3} fontSize="9" fontWeight="700" fill="#2563eb">👁 눈높이</text>
    </g>
  );
}

function CylinderView({ s, ev }: { s: DensityState; ev: SimEvent | null }) {
  if (!s.shown.cyl) return null;
  const onScale = s.scale.item === "cylinder";
  const x = onScale ? SPOT.scaleX + SPOT.cylScale - CYL.w / 2 + 2 : SPOT.cylFloor;
  const y = onScale ? BENCH_Y - 34 - CYL.h - 7 + 1 : BENCH_Y - CYL.h - 7;
  const level = Math.min(1, s.cyl.volume / CYL_MAX);
  const reading = ev?.type === "measureVol" || ev?.type === "measureChange";
  const surface = CYL.h - 2 - (CYL.h - 12) * level;
  return (
    <g className="lab-move" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {onScale ? null : <FloorShadow cx={CYL.w / 2} w={CYL.w + 26} y={CYL.h + 7} />}
      <Cylinder x={0} y={0} w={CYL.w} h={CYL.h} level={level} liquid={s.cyl.liquid} label="눈금실린더" max={CYL_MAX}
        inside={<SolidsInCylinder solids={s.cyl.solids} ev={ev} />} />
      {reading && level > 0 ? <EyeLine y={surface} /> : null}
      {pouringInto(ev, "cylinder") ? <PourWithHand key={ev?.note} x={CYL.w / 2} y1={-24} y2={CYL.h - 4} color={s.cyl.liquid === "oil" ? "#e8b923" : "#7cc4f5"} liquid={s.cyl.liquid} /> : null}
      {ev?.type === "dropSolid" && ev.container !== "beaker" ? <IronTweezers key={ev.note} x={CYL.w / 2 - 6} y={22} solid={String(ev.name)} /> : null}
    </g>
  );
}

/** 핀셋으로 집은 철조각(있으면)을 (x, y)에 넣는 손 */
const IronTweezers = ({ x, y, solid }: { x: number; y: number; solid?: string | null }) =>
  <TweezerHand x={x} y={y} tip={solid ? <g className="lab-tip-release"><IronPiece x={-solidSize(solid) / 2} y={0} s={solidSize(solid)} /></g> : null} />;

/** 넣는 중인 철조각은 핀셋에서 놓인 뒤 떨어져 바닥에 닿고(lab-drop-in), 이미 있던 것은 그대로 */
const solidClass = (ev: SimEvent | null, id: string, here: "cylinder" | "beaker") =>
  ev?.type === "dropSolid" && String(ev.name) === id && (here === "beaker") === (ev.container === "beaker") ? "lab-drop-in" : "lab-appear";

/** 이번 단계가 이 그릇에 액체를 붓는 단계인가 */
const pouringInto = (ev: SimEvent | null, c: "cylinder" | "beaker") => (ev?.type === "pour" && ev.container === c) || (ev?.type === "transfer" && ev.to === c);

const LIQ_LABEL: Record<string, string> = { water: "물", oil: "식용유" };

/** 비커 속 층 — 밀도 순서(아래→위)로 쌓인 액체와 바닥에 가라앉은 철조각. 위층부터 그려 아래층이 앞에 온다.
 *  sink: 이번에 부은 액체가 먼저 있던 액체를 뚫고 가라앉는 중 — 방울이 떨어지고 층이 천천히 자리를 바꾼다 */
function BeakerLayers({ b, sink, sinkKey, ev }: { b: DensityState["bkr"]; sink: string | null; sinkKey?: string; ev: SimEvent | null }) {
  const liquids = b.layers.filter((k) => (b.liquids[k] ?? 0) > 0);
  const tops = liquids.reduce<number[]>((acc, k) => [...acc, (acc[acc.length - 1] ?? 0) + (b.liquids[k] ?? 0) / BKR_MAX], []);
  const span = BKR.h - 6;
  const slow = sink ? "lab-sink" : undefined;
  return (
    <g>
      {liquids.map((k, i) => ({ k, i })).reverse().map(({ k, i }) => <Liquid key={k} w={BKR.w} h={BKR.h} level={tops[i]} liquid={k} top={6} className={slow} />)}
      {sink ? <SinkDrops key={sinkKey} liquid={sink} from={BKR.h - span * (tops[tops.length - 1] ?? 0) + 4} to={BKR.h - 8} /> : null}
      {b.solids.map((id, i) => <g key={id} className={solidClass(ev, id, "beaker")}><IronPiece x={10 + i * 22} y={BKR.h - 4 - solidSize(id) * 1.3} s={solidSize(id)} label={SOLID_LABEL[id]} /></g>)}
      {liquids.length > 1 ? liquids.map((k, i) => <text key={`t-${k}`} x={BKR.w - 6} y={BKR.h - span * ((tops[i] + (tops[i - 1] ?? 0)) / 2) + 3} textAnchor="end" fontSize="8" fontWeight="700" fill="#334155">{LIQ_LABEL[k]}</text>) : null}
    </g>
  );
}

const DROPS = [{ x: 0.42, d: 0.45 }, { x: 0.55, d: 0.7 }, { x: 0.36, d: 0.95 }, { x: 0.6, d: 1.2 }, { x: 0.48, d: 1.45 }, { x: 0.4, d: 1.7 }];

const Drop = ({ x, y, fall, delay, fill }: { x: number; y: number; fall: number; delay: number; fill: string }) => (
  <ellipse className="lab-sink-drop" cx={x} cy={y} rx="3.4" ry="4.2" fill={fill} stroke="#1d6fa8" strokeWidth="0.8"
    style={{ ["--fall" as string]: `${fall}px`, animationDelay: `calc(${delay}s / var(--lab-speed, 1))` }} />
);

/** 가라앉는 방울 — 위층 액체 표면에서 바닥까지 하나씩 떨어진다(물줄기가 위층을 뚫고 내려가는 모습) */
function SinkDrops({ liquid, from, to }: { liquid: string; from: number; to: number }) {
  const fill = liquid === "oil" ? "#e8b923" : "#5fb3ee";
  return (
    <g aria-hidden="true">
      {DROPS.map((p) => <Drop key={p.d} x={BKR.w * p.x} y={from} fall={Math.max(0, to - from)} delay={p.d} fill={fill} />)}
    </g>
  );
}

/** 가라앉는 중이라는 말풍선 */
function SinkCaption({ liquid, w }: { liquid: string; w: number }) {
  return (
    <g className="lab-appear" aria-hidden="true">
      <rect x={w / 2 - 50} y={6} width="100" height="15" rx="7.5" fill="#ffffff" opacity="0.92" stroke="#2563eb" strokeWidth="0.8" />
      <text x={w / 2} y={16.5} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#1d4ed8">⬇ {liquid === "oil" ? "식용유가" : "물이"} 아래로 가라앉아요</text>
    </g>
  );
}

function BeakerView({ s, ev }: { s: DensityState; ev: SimEvent | null }) {
  if (!s.shown.bkr) return null;
  const onScale = s.scale.item === "beaker";
  const x = onScale ? SPOT.scaleX + SPOT.bkrScale - BKR.w / 2 + 22 : SPOT.bkrFloor;
  const y = onScale ? BENCH_Y - 34 - BKR.h + 1 : BENCH_Y - BKR.h;
  const pourLiquid = ev?.type === "pour" ? String(ev.liquid) : ev?.type === "transfer" ? String(ev.liquid) : null;
  const sink = typeof ev?.sink === "string" && pouringInto(ev, "beaker") ? ev.sink : null;
  return (
    <g className="lab-move" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {onScale ? null : <FloorShadow cx={BKR.w / 2} w={BKR.w + 8} y={BKR.h} />}
      <Beaker x={0} y={0} w={BKR.w} h={BKR.h} level={0} liquid={null} label="비커" marks={["50", "100", "150", "200", ""]} inside={<BeakerLayers b={s.bkr} sink={sink} sinkKey={ev?.note} ev={ev} />} />
      {sink ? <SinkCaption key={`c-${ev?.note}`} liquid={sink} w={BKR.w} /> : null}
      {pouringInto(ev, "beaker") ? <PourWithHand key={ev?.note} x={BKR.w / 2} y1={-22} y2={BKR.h - 6} color={pourLiquid === "oil" ? "#e8b923" : "#7cc4f5"} liquid={pourLiquid} /> : null}
      {ev?.type === "dropSolid" && ev.container === "beaker" ? <IronTweezers key={ev.note} x={BKR.w / 2 - 6} y={10} solid={String(ev.name)} /> : null}
    </g>
  );
}

function ScaleView({ s, ev }: { s: DensityState; ev: SimEvent | null }) {
  if (!s.shown.scale) return null;
  return (
    <Scale x={SPOT.scaleX} w={170} reading={scaleText(s, ev)}>
      {s.scaleSolid ? <g className="lab-appear"><IronPiece x={-solidSize(s.scaleSolid) / 2} y={-solidSize(s.scaleSolid) * 1.3} s={solidSize(s.scaleSolid)} label={SOLID_LABEL[s.scaleSolid]} /></g> : null}
      {ev?.type === "measureMass" && ev.solid ? <IronTweezers key={ev.note} x={0} y={-solidSize(s.scaleSolid ?? "iron_small") * 1.3 - 2} /> : null}
      {ev?.type === "zero" ? <PressHand key={ev.note} x={37} y={22} /> : null}
    </Scale>
  );
}

export default function DensityScene({ state, event }: { state: DensityState | null; event: SimEvent | null }) {
  if (!state) return null;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label={event?.note ?? "밀도 실험 장치"}>
      <LabDefs />
      <LiquidDefs keys={["water", "oil"]} />
      <Bench />
      <ScaleView s={state} ev={event} />
      <BeakerView s={state} ev={event} />
      <CylinderView s={state} ev={event} />
    </svg>
  );
}
