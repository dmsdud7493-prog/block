/**
 * 녹는점 측정 — 가열·온도 측정·그래프 단계 (프로토타입 a6~a9).
 * 시간–온도 기록은 series(같은 key로 이어 붙이는 구간)로, 학생에게 보이는 값은 measurements로 낸다.
 * 녹는점 값 자체는 이벤트에 싣지 않는다 — 학생이 그래프에서 읽어 입력한다(지침 5.4, 규칙 3).
 */
import type { ReduceContext } from "../types";
import type { CalcRequest, Measurement, Series, Step } from "../../types";
import { fmtNum, round1 } from "../../format";
import {
  L, eq, firstTickAtOrAfter, fmtTimeKo, isSample, readingAt, timeline, toSec,
  type MeltRun, type MeltingState, type Reading,
} from "./model";
import { fail, freshAfterGraph, ok, type Out } from "./outcome";

function heatProblem(s: MeltingState): Out | null {
  if (s.heating) return fail(s, "already_heating", "이미 가열 중이에요.");
  if (!s.bkr.onHot) {
    return fail(s, "heat_before_setup", "핫플레이트 위에 비커가 없어요. 장치를 먼저 다 꾸민 뒤 가열해요. 물이 든 비커를 핫플레이트 위에 올려 볼까요?");
  }
  if (!s.tube.sub) return fail(s, "heat_no_sample", "시험관에 녹는점을 잴 물질을 먼저 넣어 주세요.");
  if (!s.tube.fixed) {
    return fail(s, "heat_before_setup", "장치를 먼저 다 꾸민 뒤 가열해요. 물질이 든 시험관을 비커 속 물에 잠기도록 스탠드에 고정해 볼까요?");
  }
  if (!s.thermo.in) return fail(s, "heat_no_thermometer", "온도계를 시험관 속 물질에 먼저 꽂아야 온도를 잴 수 있어요.");
  if (!s.thermo.adjusted) {
    return fail(s, "thermo_not_centered", `온도계 끝이 ${L(s.tube.sub)}의 한가운데에 오도록 먼저 높이를 맞춰요. (끝이 시험관 바닥에 닿으면 유리 바닥의 온도를 재게 돼요)`);
  }
  return null;
}

export function heat(s: MeltingState, _step: Step, ctx: ReduceContext): Out {
  const problem = heatProblem(s);
  if (problem) return problem;
  const sub = s.tube.sub as string;
  const run: MeltRun = {
    sub,
    mass: round1(s.tube.mass * ctx.param("sample.massFactor")),
    seriesKey: `temp.${sub}.t${ctx.trial}`,
    interval: null,
    melted: false,
    extraSec: 0,
    tMeltObs: null,
    tEnd: null,
    readings: [],
  };
  const state: MeltingState = { ...s, heating: true, temp: round1(ctx.param("room.temp")), solid: 1, run };
  return ok(state, "heat", "핫플레이트를 켰어요. 비커 속 물이 서서히 데워지면서 시험관 속 물질도 함께 데워져요.", { sub });
}

function measureProblem(s: MeltingState, x: string | null, iv: number): Out | null {
  if (x === "water") {
    return fail(s, "measure_water", "비커의 물이 아니라 시험관 속 고체 물질의 온도를 재요. 첫 번째 칸에 로르산이나 팔미트산을 넣어 주세요.");
  }
  if (!isSample(x)) return fail(s, "measure_not_sample", "첫 번째 칸에는 온도를 잴 물질(로르산 또는 팔미트산)을 넣어 주세요.");
  if (!s.heating || !s.run) return fail(s, "measure_before_heating", "아직 가열하지 않았어요. 핫플레이트를 켜서 물을 먼저 가열해요.");
  if (s.run.sub !== x) return fail(s, "measure_wrong_sample", `지금 녹는점을 재고 있는 물질은 ${L(s.run.sub)}이에요.`);
  if (s.run.melted) {
    return fail(s, "measure_already_melted", "이미 다 녹았어요. 이제 '완전히 투명한 액체가 된 뒤 (  ) 동안 온도를 더 측정한다' 블록을 써 볼까요?");
  }
  if (iv < 5) return fail(s, "interval_too_short", "측정 간격이 너무 짧아요. 5초 이상으로 정해 주세요.");
  if (iv > 60) return fail(s, "interval_too_long", "측정 간격이 너무 길면 온도가 일정한 구간을 놓쳐요. 60초(1분) 이하로 정해 주세요.");
  return null;
}

const seriesOf = (run: MeltRun, trial: number, points: Reading[]): Series => ({
  key: run.seriesKey,
  trial,
  subject: run.sub,
  label: `${L(run.sub)} 시간–온도`,
  points: points.map(({ t, temp }) => ({ t, temp })),
});

const meas = (key: string, label: string, value: number, unit: Measurement["unit"], sub: string, trial: number): Measurement => ({
  key: `${key}.${sub}.t${trial}`, trial, label, value, unit, subject: sub,
});

export function measureUntilMelted(s: MeltingState, step: Step, ctx: ReduceContext): Out {
  const x = eq(step, 0);
  const iv = toSec(step, 1);
  const problem = measureProblem(s, x, iv);
  if (problem) return problem;
  const run0 = s.run as MeltRun;
  const tl = timeline(run0.sub, run0.mass, ctx);
  const tFull = tl.tStart + tl.tMelt;
  const count = Number.isFinite(tFull) ? Math.ceil(tFull / iv) : 0;
  const readings = Array.from({ length: count + 1 }, (_, k) => readingAt(tl, k * iv, ctx));
  const tMeltObs = firstTickAtOrAfter(tl.tStart, iv);
  const tEnd = count * iv;
  const run: MeltRun = { ...run0, interval: iv, melted: true, tMeltObs, tEnd, readings };
  const last = readings[readings.length - 1];
  const state: MeltingState = { ...s, run, temp: last.temp, solid: 0 };
  const measurements = [
    meas("mass", "시료 질량", run.mass, "g", run.sub, ctx.trial),
    meas("meltStart", "녹기 시작한 시간", tMeltObs, "s", run.sub, ctx.trial),
    meas("meltEnd", "다 녹은 시간", tEnd, "s", run.sub, ctx.trial),
  ];
  const note = `${fmtNum(iv)}초마다 온도를 쟀어요. ${fmtTimeKo(tMeltObs)}에 녹기 시작해서 ${fmtTimeKo(tEnd)}에 모두 투명한 액체가 됐어요. 녹는 동안 온도가 어떻게 변했는지 살펴보세요.`;
  const out = ok(state, "measureUntil", note, { sub: run.sub, interval: iv, readings, tMeltObs, tEnd, seriesKey: run.seriesKey });
  return { ...out, series: [seriesOf(run, ctx.trial, readings)], measurements };
}

function moreProblem(s: MeltingState, sec: number): Out | null {
  if (!s.run || !s.run.melted) {
    return fail(s, "more_before_melted", "아직 다 녹지 않았어요. 먼저 '(  )이(가) 다 녹을 때까지 (  )마다 온도를 측정한다' 블록을 써요.");
  }
  if (sec < 30) {
    return fail(s, "more_too_short", "다 녹은 뒤에도 적어도 30초 이상(1분 정도) 더 측정해야 온도가 다시 올라가는지 확인할 수 있어요.");
  }
  if (sec > 300) return fail(s, "more_too_long", "5분 이하로 정해 주세요. 1분 정도면 충분해요.");
  return null;
}

export function measureMore(s: MeltingState, step: Step, ctx: ReduceContext): Out {
  const sec = toSec(step, 0);
  const problem = moreProblem(s, sec);
  if (problem) return problem;
  const run0 = s.run as MeltRun;
  const iv = run0.interval as number;
  const tl = timeline(run0.sub, run0.mass, ctx);
  const n = Math.max(1, Math.round(sec / iv));
  const lastT = run0.readings.length > 0 ? run0.readings[run0.readings.length - 1].t : 0;
  const added = Array.from({ length: n }, (_, k) => readingAt(tl, lastT + (k + 1) * iv, ctx));
  const run: MeltRun = { ...run0, extraSec: run0.extraSec + sec, readings: [...run0.readings, ...added] };
  const state: MeltingState = { ...s, run, temp: added[added.length - 1].temp, solid: 0 };
  const note = `모두 녹은 뒤 ${fmtTimeKo(sec)} 동안 온도를 더 쟀어요. 액체가 된 뒤 온도는 어떻게 변하나요?`;
  const out = ok(state, "measureMore", note, { sub: run.sub, sec, readings: added, seriesKey: run.seriesKey });
  return { ...out, series: [seriesOf(run, ctx.trial, added)] };
}

function graphProblem(s: MeltingState, x: string | null): Out | null {
  if (!isSample(x)) return fail(s, "graph_not_sample", "녹는점을 찾을 물질(로르산 또는 팔미트산)을 넣어 주세요.");
  if (!s.run || s.run.interval === null) {
    return fail(s, "graph_no_data", "아직 측정한 온도 기록이 없어요. 가열하면서 온도를 먼저 측정해야 그래프를 그릴 수 있어요.");
  }
  if (s.run.sub !== x) return fail(s, "graph_wrong_sample", `기록한 건 ${L(s.run.sub)}의 온도예요. 같은 물질을 넣어 볼까요?`);
  if (s.run.extraSec <= 0) {
    return fail(s, "graph_no_extra", "완전히 녹은 뒤에도 1분 정도 더 측정해야 그래프에서 온도가 일정하게 유지되는 구간을 분명히 찾을 수 있어요.");
  }
  return null;
}

export function findMeltingPoint(s: MeltingState, step: Step, ctx: ReduceContext): Out {
  const x = eq(step, 0);
  const problem = graphProblem(s, x);
  if (problem) return problem;
  const run = s.run as MeltRun;
  const request: CalcRequest = {
    key: `mp.${run.sub}.t${ctx.trial}`,
    trial: ctx.trial,
    label: "녹는점",
    unit: "°C",
    subject: run.sub,
    inputs: [run.seriesKey],
  };
  const note = `${L(run.sub)}의 시간–온도 그래프를 그렸어요. 온도가 한동안 변하지 않는 구간을 찾아 녹는점을 직접 읽어 입력해요. 핫플레이트를 끄고 장치를 정리했어요.`;
  const extra = { sub: run.sub, mass: run.mass, tMeltObs: run.tMeltObs, tEnd: run.tEnd, seriesKey: run.seriesKey };
  return { ...ok(freshAfterGraph(s), "findMp", note, extra), calcRequests: [request], endTrial: true };
}
