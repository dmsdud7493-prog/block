/**
 * 끓는점 측정 — 상태·라벨·가열 곡선 (프로토타입 boiling_point_lab.html의 newState/heatT 이식).
 * 숫자 물성은 ctx.param()으로만 얻는다(dryRun에서는 NaN → 곡선 점 없이 규칙만 검사).
 */
import type { ReduceContext } from "../types";
import type { SeriesPoint, Step, StepOutcome } from "../../types";
import { fixJosa, round1 } from "../../format";

export const BKR_MAX = 250;
export const TUBE_MAX = 30;
export const BATH_MIN = 100;
/** 끓기 시작한 뒤 응축액이 모이는 속도 (mL/분, 장면 연출용) */
const CONDENSE_PER_MIN = 1.5;

export type HeatMethod = "direct" | "bath";
export type ThermoPlace = "bkr" | "tube" | null;

export interface BoilingRun {
  liquid: string;
  volume: number;
  method: HeatMethod;
  /** 끓기 시작할 때까지 걸리는 시간(초) — 물성(NaN 가능) */
  tBoil: number;
  interval: number | null;
  boiled: boolean;
  boilT: number | null;
  lastT: number;
  extra: number;
}

export interface BoilingState {
  bkr: { liquid: string | null; volume: number; onHot: boolean };
  tube: { liquid: string | null; volume: number; fixed: boolean; stopper: boolean; hose: boolean; glass: boolean; glassIn: boolean };
  etube: { inCold: boolean; collected: number };
  thermo: { where: ThermoPlace; adjusted: boolean };
  heating: boolean;
  temp: number;
  /** 기포 세기 0~1 (장면 연출) */
  bubbles: number;
  run: BoilingRun | null;
  shown: { bkr: boolean; hot: boolean; stand: boolean; tube: boolean; cold: boolean; etube: boolean };
}

export type Out = StepOutcome<BoilingState> & { endTrial?: boolean };

export const ROOM_DEFAULT = 20;

export function initialBoilingState(): BoilingState {
  return {
    bkr: { liquid: null, volume: 0, onHot: false },
    tube: { liquid: null, volume: 0, fixed: false, stopper: false, hose: false, glass: false, glassIn: false },
    etube: { inCold: false, collected: 0 },
    thermo: { where: null, adjusted: false },
    heating: false,
    temp: ROOM_DEFAULT,
    bubbles: 0,
    run: null,
    shown: { bkr: false, hot: false, stand: false, tube: false, cold: false, etube: false },
  };
}

const LABEL: Record<string, string> = {
  water: "물", ethanol: "에탄올", beaker: "비커", side_arm_tube: "가지 달린 시험관",
  empty_tube: "빈 시험관", cold_water_beaker: "찬물 비커", hot_plate: "핫플레이트", stand: "스탠드",
  thermometer: "온도계", stopper_thermometer: "온도계 꽂은 마개", rubber_tube: "고무관", glass_tube: "유리관",
};

export const L = (id: string | null): string => (id ? LABEL[id] ?? id : "빈 칸");
export const isLiquid = (id: string | null): boolean => id === "water" || id === "ethanol";

export const eq = (step: Step, i: number): string | null => {
  const v = step.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};

/** 시간 수치 블록 → 초 (분이면 ×60) */
export const seconds = (step: Step, i: number): number => {
  const v = step.slots[i];
  if (!v || v.kind !== "quant") return Number.NaN;
  return v.unit === "min" ? v.value * 60 : v.value;
};

export const volumeOf = (step: Step, i: number): number => {
  const v = step.slots[i];
  return v && v.kind === "quant" ? v.value : Number.NaN;
};

export const fail = (s: BoilingState, code: string, message: string): Out => ({ state: s, error: { code, message: fixJosa(message) } });

/** 장면 스냅숏 — 이벤트에 실어 모니터가 그린다 */
export function sceneOf(s: BoilingState): Record<string, unknown> {
  return {
    temp: s.temp,
    bubbles: s.bubbles,
    heating: s.heating,
    condensate: s.etube.collected,
    apparatus: {
      beakerOnHot: s.bkr.onHot,
      tubeFixed: s.tube.fixed,
      stopper: s.tube.stopper,
      hose: s.tube.hose,
      glass: s.tube.glass,
      glassInTrap: s.tube.glassIn,
      trapInCold: s.etube.inCold,
      thermometer: s.thermo.where,
      thermoAdjusted: s.thermo.adjusted,
    },
  };
}

export function okOut(state: BoilingState, type: string, note: string, extra: Record<string, unknown> = {}): Out {
  return { state, event: { type, note: fixJosa(note), ...extra, scene: sceneOf(state) } };
}

/** 끓기 시작할 때까지 걸리는 시간 — 프로토타입: min(1500, (물중탕 200 | 직접 240) + 6×부피) ÷ 가열 세기 */
export function boilTime(method: HeatMethod, volume: number, ctx: ReduceContext): number {
  const base = Math.min(1500, (method === "bath" ? 200 : 240) + 6 * volume);
  return base / ctx.param("heat.rate");
}

/** 프로토타입 heatT: 실온에서 끓는점까지 곡선으로 오르다가 끓는 동안 일정 */
function heatT(run: BoilingRun, t: number, ctx: ReduceContext): number {
  const bp = ctx.param(`${run.liquid}.bp`);
  if (t >= run.tBoil) return bp;
  const room = ctx.param("room.temp");
  const p = t / run.tBoil;
  return round1(room + (bp - room) * (1 - Math.pow(1 - p, 1.7)));
}

export function reading(run: BoilingRun, t: number, ctx: ReduceContext): SeriesPoint {
  return { t, temp: round1(ctx.noise(heatT(run, t, ctx), { abs: 0.2, resolution: 0.1 })) };
}

/** 끓을 때까지 측정하는 점의 개수 (물성이 NaN이면 첫 점만) */
export function pointsUntilBoil(tBoil: number, interval: number): number {
  return Number.isFinite(tBoil) ? Math.ceil(tBoil / interval - 1e-9) + 1 : 1;
}

export const condensed = (collected: number, sec: number): number => round1(collected + (sec / 60) * CONDENSE_PER_MIN);
