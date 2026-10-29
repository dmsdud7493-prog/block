"use client";
/**
 * 혼합물 분리 2(재결정) 장면 — 비커(녹은 용액·녹지 않은 가루·결정), 유리 막대로 젓기, 얼음물 중탕,
 * 스탠드에 건 깔때기와 거름종이·걸러진 용액 비커, 전자저울. 식히면 결정이 반짝이며 생기고,
 * 거르면 거름종이에 결정이 남고 아래 비커로 용액이 떨어진다. 양은 상태 값만 쓴다.
 */
import type { SimEvent } from "@/lib/engine/types";
import type { Separation2State } from "@/lib/engine/experiments/separation2/model";
import { BENCH_Y, Bench, FloorShadow, LabDefs, LiquidDefs, VIEW_H, VIEW_W } from "./kit/defs";
import { Beaker, Label } from "./kit/glass";
import { IceBath, Stand } from "./kit/heat";
import { Readout, Scale } from "./kit/instruments";
import { Crystals, Drips, Powder } from "./kit/effects";

const total = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0);
const BK = { x: 46, w: 100, h: 100 };
const BATH = { x: 22, w: 150, h: 72 };
const FUN = { cx: 238, top: 64, w: 66 };
const CATCH = { x: FUN.cx - 30, w: 60, h: 64 };

function BeakerInside({ s }: { s: Separation2State }) {
  const b = s.bkr;
  const undis = Math.min(12, total(b.undis) * 1.4);
  const xtal = Math.min(1, total(b.xtal) / 8);
  return (
    <g>
      <Powder x={6} y={BK.h - 2} w={BK.w - 12} h={undis} />
      <Crystals x={8} y={BK.h - 5 - undis} w={BK.w - 16} amount={xtal} color={b.dis.cuso4 > 0 ? "#bfdbfe" : "#ffffff"} />
    </g>
  );
}

function MainBeaker({ s, ev }: { s: Separation2State; ev: SimEvent | null }) {
  const b = s.bkr;
  const stirring = ev?.type === "stir";
  return (
    <g>
      {s.inBath ? null : <FloorShadow cx={BK.x + BK.w / 2} w={BK.w + 6} />}
      <Beaker x={BK.x} y={BENCH_Y - BK.h - (s.inBath ? 4 : 0)} w={BK.w} h={BK.h} level={Math.min(1, b.water / 150)} liquid={b.dis.cuso4 > 0 ? "cuso4_light" : "water"} label="비커" marks={["30", "60", "90", "120", ""]}
        inside={<BeakerInside s={s} />} />
      {b.stirred || stirring ? <rect className={stirring ? "lab-shake" : undefined} x={BK.x + BK.w * 0.62} y={BENCH_Y - BK.h - 34} width="4" height={BK.h + 24} rx="2" fill="#eef5ff" stroke="#94a3b8" transform={`rotate(12 ${BK.x + BK.w * 0.62} ${BENCH_Y - BK.h})`} data-part="유리 막대" /> : null}
    </g>
  );
}

function FilterView({ s }: { s: Separation2State }) {
  if (!s.shown.filter) return null;
  const onPaper = Math.min(1, total(s.filter.paper) / 6);
  const cone = `M${FUN.cx - FUN.w / 2} ${FUN.top} L${FUN.cx + FUN.w / 2} ${FUN.top} L${FUN.cx + 6} ${FUN.top + 46} L${FUN.cx - 6} ${FUN.top + 46} Z`;
  return (
    <g data-part={`거름 장치${onPaper > 0 ? ", 거름종이 위에 결정" : ""}`}>
      <Stand x={290} top={30} armX={FUN.cx + FUN.w / 2 - 4} armY={FUN.top + 4} label="스탠드" />
      <path d={cone} fill="url(#lab-glass)" stroke="#64748b" strokeWidth="1.8" />
      <path d={`M${FUN.cx - FUN.w / 2 + 6} ${FUN.top + 3} L${FUN.cx + FUN.w / 2 - 6} ${FUN.top + 3} L${FUN.cx} ${FUN.top + 40} Z`} fill="#ffffff" stroke="#d6d3c4" data-part="거름종이" />
      <Crystals x={FUN.cx - 16} y={FUN.top + 16} w={32} amount={onPaper} />
      <rect x={FUN.cx - 3} y={FUN.top + 46} width="6" height="40" fill="url(#lab-glass)" stroke="#64748b" strokeWidth="1.5" />
      {s.filter.ready && !s.filter.done ? <Drips x={FUN.cx} y={FUN.top + 88} fall={30} color="#9fd4f7" /> : null}
      <Beaker x={CATCH.x} y={BENCH_Y - CATCH.h} w={CATCH.w} h={CATCH.h} level={s.filter.done ? Math.min(1, s.filter.fw / 120) : 0.02} liquid={s.filter.fdis.cuso4 > 0 ? "cuso4_light" : "water"} label="걸러진 용액" />
    </g>
  );
}

export default function Separation2Scene({ state, event }: { state: Separation2State | null; event: SimEvent | null }) {
  if (!state) return null;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label={event?.note ?? "재결정 실험 장치"}>
      <LabDefs />
      <LiquidDefs keys={["water", "cuso4_light", "ice_water"]} />
      <Bench />
      {state.shown.bath && state.inBath ? <IceBath x={BATH.x} y={BENCH_Y - BATH.h} w={BATH.w} h={BATH.h} label="" /> : null}
      <MainBeaker s={state} ev={event} />
      {state.shown.bath && state.inBath ? <Label x={BATH.x + BATH.w / 2} y={BENCH_Y + 16} text="얼음물 (식히는 중)" /> : null}
      <FilterView s={state} />
      {state.thermo ? <Readout x={20} y={30} value={state.bkr.T} label="비커 속 온도" /> : null}
      {state.shown.scale ? <Scale x={346} w={90} reading={state.weighed !== null ? `${state.weighed.toFixed(1)} g` : "0.0 g"} /> : null}
    </svg>
  );
}
