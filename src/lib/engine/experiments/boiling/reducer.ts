/**
 * 끓는점 측정 리듀서 — 프로토타입 boiling_point_lab.html의 applyStep을 불변 상태로 이식.
 * 장치 준비(a1~a7)는 setup.ts, 가열·측정·그래프(a8~a11)는 이 파일.
 * 숫자는 ctx.param()/ctx.noise()로만 얻는다(dryRun에서는 NaN — NaN 비교로 오류를 만들지 않는다).
 */
import type { ReduceContext } from "../types";
import type { CalcRequest, Measurement, Series, SeriesPoint, Step } from "../../types";
import {
  boilTime, condensed, eq, fail, initialBoilingState, isLiquid, L, okOut, pointsUntilBoil, reading, seconds,
  type BoilingRun, type BoilingState, type Out,
} from "./model";
import { SETUP_HANDLERS } from "./setup";

export { initialBoilingState, type BoilingState } from "./model";

const SETUP_STEPS = ["a1", "a2", "a3", "a4", "a5", "a6", "a7"];

const seriesKey = (subject: string, trial: number): string => `temp.${subject}.t${trial}`;

function fmtTimeKo(sec: number): string {
  if (!Number.isFinite(sec)) return "잠시";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (!m) return `${s}초`;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

function bathProblem(s: BoilingState): Out | null {
  const t = s.tube;
  if (!t.fixed) return fail(s, "heat_tube_not_fixed", "가지 달린 시험관을 비커 속 물에 잠기도록 스탠드에 고정해야 해요.");
  if (!t.stopper) return fail(s, "heat_no_stopper", "시험관 입구를 온도계 꽂은 마개로 막아야 에탄올의 온도를 잴 수 있어요.");
  if (!s.thermo.adjusted) return fail(s, "thermo_not_adjusted", "온도계 끝이 에탄올의 한가운데에 오도록 먼저 높이를 조절해요.");
  if (!t.hose) return fail(s, "vapour_no_hose", "에탄올 증기가 그냥 빠져나가면 위험해요. 가지에 고무관을 먼저 연결해 주세요.");
  if (!t.glass) return fail(s, "vapour_no_glass", "고무관 끝에 유리관을 연결해야 증기를 찬물 쪽으로 보낼 수 있어요.");
  if (!t.glassIn) return fail(s, "vapour_no_cold_trap", "유리관 끝을 찬물 비커 속 빈 시험관에 넣어야 에탄올 증기가 식어서 모여요.");
  return null;
}

function directProblem(s: BoilingState): Out | null {
  if (s.bkr.liquid !== "water") return fail(s, "heat_before_setup", "비커에 물이 없어요. 먼저 비커에 물을 넣어 주세요.");
  if (s.thermo.where !== "bkr") return fail(s, "heat_no_thermometer", "온도계를 스탠드에 고정해야 물의 온도를 잴 수 있어요.");
  if (!s.thermo.adjusted) {
    return fail(s, "thermo_not_adjusted", "온도계 끝이 물의 한가운데에 오도록 먼저 높이를 조절해요. (바닥에 닿으면 비커 바닥의 온도를 재게 돼요)");
  }
  return null;
}

/** a8 — 핫플레이트를 켜서 가열을 시작한다 */
function startHeating(s: BoilingState, _step: Step, ctx: ReduceContext): Out {
  if (s.heating) return fail(s, "already_heating", "이미 가열 중이에요.");
  if (!s.bkr.onHot) {
    return fail(s, "heat_before_setup", "핫플레이트 위에 비커가 없어요. 장치를 먼저 준비해요. 물이 든 비커를 핫플레이트 위에 올려 주세요.");
  }
  const bath = s.tube.liquid === "ethanol";
  const problem = bath ? bathProblem(s) : directProblem(s);
  if (problem) return problem;
  const liquid = bath ? "ethanol" : "water";
  const volume = bath ? s.tube.volume : s.bkr.volume;
  const method = bath ? "bath" : "direct";
  const run: BoilingRun = {
    liquid, volume, method, tBoil: boilTime(method, volume, ctx),
    interval: null, boiled: false, boilT: null, lastT: 0, extra: 0,
  };
  const state: BoilingState = { ...s, heating: true, temp: ctx.param("room.temp"), bubbles: 0, run, shown: { ...s.shown, hot: true } };
  const m: Measurement = { key: `volume.${liquid}.t${ctx.trial}`, trial: ctx.trial, label: "액체의 양", value: volume, unit: "mL", subject: liquid };
  const note = bath
    ? "핫플레이트를 켰어요! 비커의 물이 데워지면서 시험관 속 에탄올도 천천히 데워져요. (물중탕)"
    : "핫플레이트를 켰어요! 비커 속 물을 직접 가열해요.";
  return { ...okOut(state, "heat", note, { liquid, method }), measurements: [m] };
}

function mkSeries(run: BoilingRun, trial: number, points: SeriesPoint[]): Series {
  return { key: seriesKey(run.liquid, trial), trial, subject: run.liquid, label: `${L(run.liquid)}의 온도`, points };
}

function measureProblem(s: BoilingState, liq: string | null, iv: number): Out | null {
  if (!isLiquid(liq)) return fail(s, "measure_not_liquid", "첫 번째 칸에는 온도를 잴 액체(물 또는 에탄올)를 넣어 주세요.");
  const run = s.run;
  if (!s.heating || !run) return fail(s, "measure_before_heat", "아직 가열하지 않았어요. 핫플레이트를 켜서 가열을 먼저 시작해요.");
  if (run.liquid !== liq) {
    const extra = run.method === "bath" ? " (비커의 물은 데우는 용도예요)" : "";
    return fail(s, "measure_wrong_liquid", `지금 끓는점을 재고 있는 액체는 ${L(run.liquid)}이에요.${extra}`);
  }
  if (run.boiled) {
    return fail(s, "already_boiling", "이미 끓기 시작했어요. 이제 '끓기 시작한 뒤 (  ) 동안 온도를 더 측정하여 기록한다' 블록을 써요.");
  }
  if (iv < 5) return fail(s, "interval_too_short", "측정 간격이 너무 짧아요. 5초 이상으로 정해 주세요.");
  if (iv > 60) return fail(s, "interval_too_long", "측정 간격이 너무 길면 온도 변화를 놓쳐요. 60초(1분) 이하로 정해 주세요.");
  return null;
}

/** a9 — (  )이(가) 끓을 때까지 (  )마다 온도를 측정한다 */
function measureUntilBoil(s: BoilingState, step: Step, ctx: ReduceContext): Out {
  const liq = eq(step, 0);
  const iv = seconds(step, 1);
  const problem = measureProblem(s, liq, iv);
  if (problem || !s.run) return problem ?? fail(s, "measure_before_heat", "아직 가열하지 않았어요.");
  const run0 = s.run;
  const n = pointsUntilBoil(run0.tBoil, iv);
  const points = Array.from({ length: n }, (_, k) => reading(run0, k * iv, ctx));
  const boilT = (n - 1) * iv;
  const run: BoilingRun = { ...run0, interval: iv, boiled: true, boilT, lastT: boilT };
  const collected = run.method === "bath" ? 0.3 : 0;
  const last = points[points.length - 1];
  const state: BoilingState = { ...s, run, temp: last.temp, bubbles: 0.6, etube: { ...s.etube, collected } };
  const m: Measurement = { key: `boil_start.${run.liquid}.t${ctx.trial}`, trial: ctx.trial, label: "끓기 시작한 시간", value: boilT, unit: "s", subject: run.liquid };
  const note = `${fmtTimeKo(iv)}마다 ${L(run.liquid)}의 온도를 측정했어요. ${fmtTimeKo(boilT)}쯤 ${L(run.liquid)}이(가) 끓기 시작했어요! 끓기 시작하면 온도가 어떻게 변하는지 계속 지켜보세요.`;
  const out = okOut(state, "measureUntil", note, { liquid: run.liquid, interval: iv, boilT, count: n });
  return { ...out, series: [mkSeries(run, ctx.trial, points)], measurements: [m] };
}

/** a10 — 끓기 시작한 뒤 (  ) 동안 온도를 더 측정하여 기록한다 */
function measureMore(s: BoilingState, step: Step, ctx: ReduceContext): Out {
  const sec = seconds(step, 0);
  const run0 = s.run;
  if (!run0 || !run0.boiled || run0.interval === null) {
    return fail(s, "extra_before_boil", "아직 끓기 시작하지 않았어요. 먼저 '(  )이(가) 끓을 때까지 (  )마다 온도를 측정한다' 블록을 써요.");
  }
  if (sec < 30) return fail(s, "extra_too_short", "끓기 시작한 뒤 적어도 30초 이상(1분 정도) 더 측정해야 온도가 일정하게 유지되는지 확인할 수 있어요.");
  if (sec > 300) return fail(s, "extra_too_long", "5분 이하로 정해 주세요. 너무 오래 끓이면 액체가 모두 날아가 버려요.");
  const iv = run0.interval;
  const n = Math.max(1, Math.round(sec / iv));
  const points = Array.from({ length: n }, (_, k) => reading(run0, run0.lastT + (k + 1) * iv, ctx));
  const run: BoilingRun = { ...run0, lastT: run0.lastT + n * iv, extra: run0.extra + sec };
  const collected = run.method === "bath" ? condensed(s.etube.collected, sec) : s.etube.collected;
  const state: BoilingState = { ...s, run, temp: points[points.length - 1].temp, bubbles: 1, etube: { ...s.etube, collected } };
  const note = `끓는 동안 ${fmtTimeKo(sec)} 더 온도를 측정했어요. 계속 가열해도 온도가 어떻게 되는지 그래프에서 확인해 볼까요?`;
  const out = okOut(state, "measureMore", note, { liquid: run.liquid, sec, count: n });
  return { ...out, series: [mkSeries(run, ctx.trial, points)] };
}

function graphProblem(s: BoilingState, liq: string | null): Out | null {
  if (!isLiquid(liq)) return fail(s, "graph_not_liquid", "끓는점을 찾을 액체(물 또는 에탄올)를 넣어 주세요.");
  if (!s.run || s.run.interval === null) {
    return fail(s, "graph_no_data", "아직 측정한 온도 기록이 없어요. 가열하면서 온도를 먼저 측정해야 그래프를 그릴 수 있어요.");
  }
  if (s.run.liquid !== liq) return fail(s, "graph_wrong_liquid", `기록한 건 ${L(s.run.liquid)}의 온도예요. 같은 액체를 넣어 주세요.`);
  if (!s.run.extra) {
    return fail(s, "graph_no_extra", "끓기 시작한 뒤에도 1분 정도 더 측정해야 그래프에서 온도가 일정하게 유지되는 구간을 찾을 수 있어요.");
  }
  return null;
}

/** a11 — 시간에 따른 온도 변화를 그래프로 그려 (  )의 끓는점을 찾는다 (시도 경계) */
function findBoilingPoint(s: BoilingState, step: Step, ctx: ReduceContext): Out {
  const liq = eq(step, 0);
  const problem = graphProblem(s, liq);
  if (problem || !s.run) return problem ?? fail(s, "graph_no_data", "아직 측정한 온도 기록이 없어요.");
  const run = s.run;
  const key = seriesKey(run.liquid, ctx.trial);
  const request: CalcRequest = { key: `bp.${run.liquid}.t${ctx.trial}`, trial: ctx.trial, label: "끓는점", unit: "°C", subject: run.liquid, inputs: [key] };
  const note = `${L(run.liquid)}의 시간–온도 그래프를 그렸어요. 온도가 일정하게 유지되는 구간을 찾아 끓는점을 직접 표에 입력해요. 측정 끝! 핫플레이트를 끄고 장치를 정리했어요.`;
  const out = okOut(initialBoilingState(), "findBp", note, { liquid: run.liquid, method: run.method, volume: run.volume, boilT: run.boilT, series: key });
  return { ...out, calcRequests: [request], endTrial: true };
}

const HANDLERS: Record<string, (s: BoilingState, step: Step, ctx: ReduceContext) => Out> = {
  ...SETUP_HANDLERS,
  a8: startHeating,
  a9: measureUntilBoil,
  a10: measureMore,
  a11: findBoilingPoint,
};

export function reduceBoiling(s: BoilingState, step: Step, ctx: ReduceContext): Out {
  if (SETUP_STEPS.includes(step.action) && s.heating) {
    return fail(s, "setup_while_heating", "이미 가열 중이에요. 실험 장치는 핫플레이트를 켜기 전에 모두 준비해야 해요.");
  }
  const h = HANDLERS[step.action];
  return h ? h(s, step, ctx) : fail(s, "unknown_block", "알 수 없는 블록이에요.");
}
