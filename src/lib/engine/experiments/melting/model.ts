/**
 * 녹는점 측정 — 상태 모양·장치 기하·시간–온도 곡선 (프로토타입 melting_point_lab.html의 tempAt/solidAt 이식).
 * 물성 수치(녹는점·실온·가열 속도)는 모두 ctx.param()으로 받는다 — dryRun에서는 NaN.
 */
import type { ReduceContext } from "../types";
import type { SeriesPoint, Step } from "../../types";
import { round1 } from "../../format";

export const BKR_MAX = 250;
export const TUBE_MAX_G = 10;
export const SAMPLES = ["lauric_acid", "palmitic_acid"] as const;

export const LABEL: Record<string, string> = {
  lauric_acid: "로르산",
  palmitic_acid: "팔미트산",
  water: "물",
  test_tube: "시험관",
  beaker: "비커",
  hot_plate: "핫플레이트",
  stand: "스탠드",
  thermometer: "온도계",
};

export const L = (id: string | null): string => (id ? LABEL[id] ?? id : "빈 칸");
export const isSample = (id: string | null): id is string => id === "lauric_acid" || id === "palmitic_acid";

export interface Reading extends SeriesPoint {
  /** 남은 고체 비율 (1 = 모두 고체, 0 = 모두 액체) */
  solid: number;
}

export interface MeltRun {
  sub: string;
  /** 실제 시료 질량(g) — 세션마다 조금씩 다르다 */
  mass: number;
  seriesKey: string;
  interval: number | null;
  melted: boolean;
  /** 다 녹은 뒤 더 측정한 시간(초) */
  extraSec: number;
  tMeltObs: number | null;
  tEnd: number | null;
  readings: Reading[];
}

export interface MeltingState {
  bkr: { water: boolean; volume: number; onHot: boolean };
  tube: { sub: string | null; mass: number; fixed: boolean };
  thermo: { in: boolean; adjusted: boolean };
  heating: boolean;
  /** 시료의 현재 온도 (null = 아직 가열 전, 실온) */
  temp: number | null;
  solid: number;
  run: MeltRun | null;
  /** 정리한 뒤에도 남겨 두는 지난 실험 그래프 */
  lastGraph: { sub: string; seriesKey: string } | null;
  shown: { bkr: boolean; hot: boolean; stand: boolean; tube: boolean };
}

export function initialMeltingState(): MeltingState {
  return {
    bkr: { water: false, volume: 0, onHot: false },
    tube: { sub: null, mass: 0, fixed: false },
    thermo: { in: false, adjusted: false },
    heating: false,
    temp: null,
    solid: 1,
    run: null,
    lastGraph: null,
    shown: { bkr: false, hot: false, stand: false, tube: false },
  };
}

/* 화면 높이(px) — 프로토타입의 비커 물 높이·시험관 속 시료 높이. 학생 입력만으로 계산(물성 아님) */
const bkrH = (vol: number): number => (vol > 0 ? Math.min(104, 10 + vol * 0.38) : 0);
const subH = (g: number): number => (g > 0 ? Math.min(66, 8 + g * 5.5) : 0);
const TUBE_Y = 236;

export function immersed(volume: number, mass: number): boolean {
  return 248 - bkrH(volume) <= TUBE_Y - subH(mass) - 4;
}

export function waterNeeded(mass: number): number {
  const need = 248 - (TUBE_Y - subH(mass) - 4);
  return Math.ceil((need - 10) / 0.38 / 10) * 10;
}

/** 가열 시작부터의 시간표 (초) */
export interface Timeline {
  room: number;
  mp: number;
  tStart: number;
  tMelt: number;
}

export function timeline(sub: string, mass: number, ctx: ReduceContext): Timeline {
  const room = ctx.param("room.temp");
  const mp = ctx.param(`${sub}.mp`);
  const tStart = Math.round((mp - room) * ctx.param("heat.secPerDeg") + mass * ctx.param("heat.secPerGram"));
  const tMelt = Math.round(ctx.param("melt.baseSec") + mass * ctx.param("melt.secPerGram"));
  return { room, mp, tStart, tMelt };
}

function rawTempAt(tl: Timeline, t: number, ctx: ReduceContext): number {
  const tFull = tl.tStart + tl.tMelt;
  if (t < tl.tStart) {
    const p = t / tl.tStart;
    return tl.room + (tl.mp - tl.room) * (1 - Math.pow(1 - p, ctx.param("heat.curve")));
  }
  if (t <= tFull) return tl.mp;
  return tl.mp + ctx.param("after.rise") * (1 - Math.exp(-(t - tFull) / ctx.param("after.tauSec")));
}

export function readingAt(tl: Timeline, t: number, ctx: ReduceContext): Reading {
  const temp = round1(ctx.noise(rawTempAt(tl, t, ctx), { abs: 0.1, resolution: 0.1 }));
  return { t, temp, solid: solidAt(tl, t) };
}

export function solidAt(tl: Timeline, t: number): number {
  if (t < tl.tStart) return 1;
  if (t >= tl.tStart + tl.tMelt) return 0;
  return Math.round((1 - (t - tl.tStart) / tl.tMelt) * 100) / 100;
}

/** 첫 측정 시각 ≥ target (간격의 배수). NaN이면 NaN */
export const firstTickAtOrAfter = (target: number, iv: number): number => Math.ceil(target / iv) * iv;

/** 측정 칸의 시간 → 초 */
export function toSec(step: Step, i: number): number {
  const v = step.slots[i];
  if (!v || v.kind !== "quant") return Number.NaN;
  return v.unit === "min" ? v.value * 60 : v.value;
}

export const eq = (step: Step, i: number): string | null => {
  const v = step.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};

export const quant = (step: Step, i: number): { value: number; unit: string } | null => {
  const v = step.slots[i];
  return v && v.kind === "quant" ? { value: v.value, unit: v.unit } : null;
};

export function fmtTimeKo(sec: number): string {
  if (!Number.isFinite(sec)) return "?초";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (!m) return `${s}초`;
  return s ? `${m}분 ${s}초` : `${m}분`;
}
