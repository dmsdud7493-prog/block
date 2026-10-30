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
import { Beaker, Cylinder } from "./kit/glass";
import { Scale } from "./kit/instruments";
import { IronPiece, PourStream } from "./kit/effects";
import { PouringHand, PressHand, TweezerHand } from "./kit/hand";

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
function SolidsInCylinder({ solids }: { solids: string[] }) {
  return (
    <g>
      {solids.map((id, i) => <g key={id} className="lab-appear"><IronPiece x={6 + i * 15} y={CYL.h - 4 - solidSize(id) * 1.3} s={solidSize(id)} label={SOLID_LABEL[id]} /></g>)}
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
        inside={<SolidsInCylinder solids={s.cyl.solids} />} />
      {reading && level > 0 ? <EyeLine y={surface} /> : null}
      {pouringInto(ev, "cylinder") ? <PourStream key={ev?.note} x={CYL.w / 2} y1={-24} y2={surface} color={s.cyl.liquid === "oil" ? "#e8b923" : "#7cc4f5"} /> : null}
      {pouringInto(ev, "cylinder") ? <PouringHand key={ev?.note} sx={CYL.w / 2} sy={-24} liquid={s.cyl.liquid} /> : null}
      {ev?.type === "dropSolid" ? <IronTweezers key={ev.note} x={CYL.w / 2 - 6} y={22} solid={String(ev.name)} /> : null}
    </g>
  );
}

/** 핀셋으로 집은 철조각(있으면)을 (x, y)에 넣는 손 */
const IronTweezers = ({ x, y, solid }: { x: number; y: number; solid?: string | null }) =>
  <TweezerHand x={x} y={y} tip={solid ? <IronPiece x={-solidSize(solid) / 2} y={0} s={solidSize(solid)} /> : null} />;

/** 이번 단계가 이 그릇에 액체를 붓는 단계인가 */
const pouringInto = (ev: SimEvent | null, c: "cylinder" | "beaker") => (ev?.type === "pour" && ev.container === c) || (ev?.type === "transfer" && ev.to === c);

function BeakerView({ s, ev }: { s: DensityState; ev: SimEvent | null }) {
  if (!s.shown.bkr) return null;
  const onScale = s.scale.item === "beaker";
  const x = onScale ? SPOT.scaleX + SPOT.bkrScale - BKR.w / 2 + 22 : SPOT.bkrFloor;
  const y = onScale ? BENCH_Y - 34 - BKR.h + 1 : BENCH_Y - BKR.h;
  return (
    <g className="lab-move" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {onScale ? null : <FloorShadow cx={BKR.w / 2} w={BKR.w + 8} y={BKR.h} />}
      <Beaker x={0} y={0} w={BKR.w} h={BKR.h} level={Math.min(1, s.bkr.volume / BKR_MAX)} liquid={s.bkr.liquid} label="비커" marks={["50", "100", "150", "200", ""]} />
      {pouringInto(ev, "beaker") ? <PourStream key={ev?.note} x={BKR.w / 2} y1={-22} y2={BKR.h * (1 - Math.min(1, s.bkr.volume / BKR_MAX)) + 4} color={s.bkr.liquid === "oil" ? "#e8b923" : "#7cc4f5"} /> : null}
      {pouringInto(ev, "beaker") ? <PouringHand key={ev?.note} sx={BKR.w / 2} sy={-22} liquid={s.bkr.liquid} /> : null}
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
