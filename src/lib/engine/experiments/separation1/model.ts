/**
 * 끓는점 차를 이용한 혼합물 분리(물–에탄올 증류) — 상태 타입과 온도·분리 모델.
 * 프로토타입 mixture_separation_lab1.html의 tempAt/progressAt을 순수 함수로 이식.
 * 물성 수치는 모두 ctx.param()으로 받는다(dryRun에서는 NaN → 값만 NaN, 규칙 판단에는 쓰지 않음).
 */
import type { ReduceContext } from "../types";
import type { SeriesPoint, Step, StepOutcome } from "../../types";
import { fixJosa, round1 } from "../../format";

/** 플라스크 최대 부피(mL)·끓임쪽 최대 개수 — 규칙(학생 입력 검사)용 상수, 물성 아님 */
export const FLASK_MAX = 60;
export const CHIP_MAX = 5;

export type Phase = "heat" | "plateau" | "stopped";

/** 가열 시작 시 잡아 둔 물성(세션 파라미터) — dryRun에서는 NaN */
export interface RunPhysics {
  room: number;
  start: number;
  rise: number;
  bp: number;
  ethFrac: number;
  waterFrac: number;
}

export interface DistRun {
  water: number;
  ethanol: number;
  /** 끓기 시작(평탄 구간 시작) 시각 s */
  t1: number;
  /** 평탄 구간 길이 s */
  tp: number;
  t2: number;
  phys: RunPhysics;
  interval: number;
  readings: SeriesPoint[];
  phase: Phase;
  observed: boolean;
  tStop: number | null;
  checked: { tube: boolean; flask: boolean };
}

export interface Separation1State {
  flask: {
    water: number;
    ethanol: number;
    chips: number;
    stopper: boolean;
    onHot: boolean;
    hose: boolean;
    glass: boolean;
    glassIn: boolean;
  };
  thermo: { adjusted: boolean; position: string | null };
  etube: { inCold: boolean; collected: number };
  heating: boolean;
  /** 가지 부분 온도계 눈금 */
  temp: number;
  /** 지금 기체가 가지로 빠져나가고 있는가(장면 표시용) */
  vapour: boolean;
  run: DistRun | null;
  /** 그래프 블록으로 정리한 지난 실험이 있는가 */
  hadRun: boolean;
}

export function initialSeparation1State(): Separation1State {
  return {
    flask: { water: 0, ethanol: 0, chips: 0, stopper: false, onHot: false, hose: false, glass: false, glassIn: false },
    thermo: { adjusted: false, position: null },
    etube: { inCold: false, collected: 0 },
    heating: false,
    temp: Number.NaN,
    vapour: false,
    run: null,
    hadRun: false,
  };
}

export const LABEL: Record<string, string> = {
  water: "물",
  ethanol: "에탄올",
  boiling_chips: "끓임쪽",
  side_arm_flask: "가지 달린 삼각플라스크",
  stopper_thermometer: "온도계 꽂은 마개",
  thermometer: "온도계",
  hot_plate: "핫플레이트",
  rubber_tube: "고무관",
  glass_tube: "유리관",
  test_tube: "시험관",
  ice_water_beaker: "얼음물 비커",
  beaker: "비커",
  branch: "가지 갈라지는 부분",
  in_solution: "용액 속",
  flask_bottom: "플라스크 바닥",
};
export const L = (id: string | null): string => (id ? LABEL[id] ?? id : "빈 칸");

export const eq = (step: Step, i: number): string | null => {
  const v = step.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};
export const pos = (step: Step, i: number): string | null => {
  const v = step.slots[i];
  return v && v.kind === "pos" ? v.id : null;
};
export const quant = (step: Step, i: number): { value: number; unit: string } | null => {
  const v = step.slots[i];
  return v && v.kind === "quant" ? { value: v.value, unit: v.unit } : null;
};

/** 시간 블록(초/분) → 초 */
export const toSec = (q: { value: number; unit: string } | null): number =>
  q ? (q.unit === "min" ? q.value * 60 : q.value) : Number.NaN;

const finiteOr = (v: number, d: number): number => (Number.isFinite(v) ? v : d);

export function runPhysics(ctx: ReduceContext): RunPhysics {
  return {
    room: ctx.param("room.temp"),
    start: ctx.param("ethanol.plateau_start"),
    rise: ctx.param("ethanol.plateau_rise"),
    bp: ctx.param("water.bp"),
    ethFrac: ctx.param("collect.ethanol_frac"),
    waterFrac: ctx.param("collect.water_frac"),
  };
}

/**
 * 시간축(언제 끓기 시작하고 얼마 동안 평탄한가). 가열 세기 파라미터가 NaN(dryRun)이면 1로 둔다:
 * 시간축은 읽기 횟수(배열 길이)만 정하고 어떤 규칙 판단에도 쓰이지 않으므로 dryRun 진단과 무관하다.
 */
export function newRun(water: number, ethanol: number, ctx: ReduceContext): DistRun {
  const rate = finiteOr(ctx.param("heat.rate"), 1);
  const total = round1(water + ethanol);
  const t1 = Math.round((150 + 3 * total) / rate);
  const tp = Math.round(Math.max(240, 120 + 10 * ethanol) / rate);
  return {
    water, ethanol, t1, tp, t2: t1 + tp, phys: runPhysics(ctx),
    interval: 0, readings: [], phase: "heat", observed: false, tStop: null,
    checked: { tube: false, flask: false },
  };
}

/** 시간 t(초)에 가지 부분 온도 — 상승 → 거의 일정(start..start+rise, 단조 증가) → 다시 상승 */
export function tempAt(run: DistRun, t: number): number {
  const { room, start, rise, bp } = run.phys;
  if (t <= run.t1) {
    const p = t / run.t1;
    return room + (start - room) * (1 - Math.pow(1 - p, 1.25));
  }
  if (t <= run.t2) {
    const f = (t - run.t1) / run.tp;
    return start + rise * f * f;
  }
  const end = start + rise;
  return end + (bp - end) * (1 - Math.exp(-(t - run.t2) / 70));
}

/** 시간 t에 플라스크에 남은 양과 시험관에 모인 양 */
export function progressAt(run: DistRun, t: number): { water: number; ethanol: number; collected: number } {
  const f = Math.max(0, Math.min(1, (t - run.t1) / run.tp));
  const colEth = run.ethanol * run.phys.ethFrac;
  const colWater = run.water * run.phys.waterFrac;
  return {
    water: round1(run.water - colWater * f),
    ethanol: round1(run.ethanol - colEth * f),
    collected: round1((colEth + colWater) * f),
  };
}

export function reading(run: DistRun, t: number, ctx: ReduceContext): SeriesPoint {
  return { t, temp: round1(ctx.noise(tempAt(run, t), { resolution: 0.1 })) };
}

/** first부터 interval 간격으로 count개의 측정 시각 */
export const timesFrom = (first: number, interval: number, count: number): number[] =>
  Array.from({ length: Math.max(0, count) }, (_, k) => first + k * interval);

/** a8: 0초부터 끓기 시작 뒤 조금 더(max(2·간격, 30초))까지 */
export function timesUntilPlateau(run: DistRun, iv: number): number[] {
  const until = run.t1 + Math.max(2 * iv, 30);
  return timesFrom(0, iv, Math.ceil(until / iv) + 1);
}

/** a9: 평탄 구간 안에서 약 30초 더 관찰 */
export function timesObserve(run: DistRun, last: number): number[] {
  const iv = run.interval;
  const bySpan = Math.ceil(30 / iv);
  const byEnd = Math.max(0, Math.ceil((run.t2 - last) / iv) - 1);
  return timesFrom(last + iv, iv, Math.min(bySpan, byEnd));
}

/** a10: 온도가 다시 오르는 것을 확인할 때까지(평탄 끝 + max(간격, 75초)) */
export function timesUntilRise(run: DistRun, last: number): number[] {
  const iv = run.interval;
  const stopAt = run.t2 + Math.max(iv, 75);
  return timesFrom(last + iv, iv, Math.max(1, Math.ceil((stopAt - last) / iv)));
}

/** 측정 시각들을 읽어 run·플라스크·시험관 상태를 그 시각까지 진행시킨다 */
export function advance(s: Separation1State, run: DistRun, times: number[], ctx: ReduceContext, phase: Phase): Separation1State {
  const added = times.map((t) => reading(run, t, ctx));
  const readings = [...run.readings, ...added];
  const lastT = readings.length > 0 ? readings[readings.length - 1].t : 0;
  const p = progressAt(run, lastT);
  const nextRun: DistRun = { ...run, readings, phase };
  const boiling = lastT >= run.t1 && lastT <= run.t2;
  return {
    ...s,
    run: nextRun,
    flask: { ...s.flask, water: p.water, ethanol: p.ethanol },
    etube: { ...s.etube, collected: p.collected },
    temp: readings.length > 0 ? readings[readings.length - 1].temp : s.temp,
    vapour: boiling,
  };
}

export type Out = StepOutcome<Separation1State> & { endTrial?: boolean };

export const fail = (s: Separation1State, code: string, message: string): Out => ({
  state: s,
  error: { code, message: fixJosa(message) },
});

/** 이벤트에 싣는 장면 요약(플라스크 속 혼합물·온도·기체·모인 액체·가열 여부) */
export function sceneOf(s: Separation1State): Record<string, unknown> {
  return {
    flaskWater: s.flask.water,
    flaskEthanol: s.flask.ethanol,
    chips: s.flask.chips,
    temp: s.temp,
    vapour: s.vapour,
    collected: s.etube.collected,
    heatingOn: s.heating,
  };
}

export const ok = (state: Separation1State, type: string, note: string, extra: Record<string, unknown> = {}): Out => ({
  state,
  event: { type, note: fixJosa(note), ...sceneOf(state), ...extra },
});
