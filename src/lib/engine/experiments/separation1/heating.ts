/**
 * 끓는점 차를 이용한 혼합물 분리 — 가열·측정·관찰·정리 단계(a7~a12) 리듀서.
 * 시간에 따른 가지 부분 온도(series)와 학생에게 제시하는 측정값을 만들고,
 * 평탄 구간 온도는 학생이 그래프에서 읽어 입력한다(CalcRequest, 정답은 서버 grader).
 */
import type { ReduceContext } from "../types";
import type { CalcRequest, Measurement, Series, Step } from "../../types";
import { fmtNum, round1 } from "../../format";
import {
  L, advance, eq, fail, initialSeparation1State, newRun, ok, quant, timesObserve, timesUntilPlateau,
  timesUntilRise, toSec, type DistRun, type Out, type Separation1State,
} from "./model";

function fmtTimeKo(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (!m) return `${s}초`;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

const mk = (key: string, label: string, value: number, unit: Measurement["unit"], subject: string, trial: number): Measurement => ({
  key, trial, label, value, unit, subject,
});

/** 가열 전에 장치가 모두 준비되었는지 — 처음으로 빠진 것 하나만 안내 */
function setupProblem(s: Separation1State): string | null {
  const f = s.flask;
  if (!f.stopper) return "플라스크 입구가 열려 있으면 끓어 나온 기체가 그냥 날아가 버려요. 온도계 꽂은 마개로 입구를 막아 주세요.";
  if (!f.onHot) return "플라스크가 핫플레이트 위에 없어요. 먼저 핫플레이트 위에 올려 주세요.";
  if (!s.thermo.adjusted) return "온도계 끝의 높이를 먼저 맞춰야 해요. 어느 곳의 온도를 재야 할지 생각해 보세요.";
  if (!f.hose) return "가지에 고무관을 연결해야 끓어 나온 기체가 지나갈 길이 생겨요.";
  if (!f.glass) return "고무관 반대쪽 끝에 유리관을 연결해야 해요.";
  if (!s.etube.inCold) return "시험관을 얼음물 비커 속에 넣어 두어야 기체가 식어서 액체로 모여요.";
  if (!f.glassIn) return "유리관 끝을 얼음물 속 시험관 안에 넣어야 해요.";
  return null;
}

/** a7: 핫플레이트를 켜서 서서히 가열한다 */
export function startHeating(s: Separation1State, _step: Step, ctx: ReduceContext): Out {
  const f = s.flask;
  if (s.heating) return fail(s, "heat_already", "이미 가열 중이에요.");
  if (s.run) return fail(s, "run_finished", "이번 실험은 이미 끝났어요. 그래프로 정리한 뒤 새 실험을 처음부터 조립해요.");
  if (!f.water || !f.ethanol) {
    const need = !f.water && !f.ethanol ? "물과 에탄올을" : !f.water ? "물도" : "에탄올도";
    return fail(s, "heat_no_mixture", `이 실험은 물과 에탄올 혼합물을 분리하는 실험이에요. 가지 달린 삼각플라스크에 ${need} 넣어 주세요.`);
  }
  if (!f.chips) {
    return fail(s, "no_boiling_chips", "끓임쪽 없이 가열하면 용액이 갑자기 끓어 넘칠 수 있어요. 가열하기 전에 끓임쪽을 2~3개 넣어 주세요.");
  }
  const problem = setupProblem(s);
  if (problem) return fail(s, "heat_before_setup", problem);
  const run = newRun(f.water, f.ethanol, ctx);
  const state: Separation1State = { ...s, run, heating: true, temp: round1(ctx.noise(run.phys.room, { resolution: 0.1 })), vapour: false };
  return ok(state, "heat", "핫플레이트를 켜서 플라스크를 서서히 가열해요.");
}

function runProblem(s: Separation1State, beforeMsg: string, stoppedMsg: string): Out | null {
  if (!s.run) return fail(s, "not_heated_yet", beforeMsg);
  if (!s.heating) return fail(s, "heating_stopped", stoppedMsg);
  return null;
}

/** a8: 온도가 일정하게 유지될 때까지 (  )마다 온도를 측정한다 */
export function measureUntil(s: Separation1State, step: Step, ctx: ReduceContext): Out {
  const problem = runProblem(s, "아직 가열하지 않았어요. 핫플레이트를 켜서 가열을 먼저 시작해요.", "이미 가열을 멈췄어요.");
  if (problem || !s.run) return problem ?? fail(s, "not_heated_yet", "아직 가열하지 않았어요.");
  if (s.run.phase !== "heat") {
    return fail(s, "plateau_already", "이미 온도가 일정한 구간을 찾았어요. 이제 얼음물 속 시험관을 관찰해 보세요.");
  }
  const iv = toSec(quant(step, 0));
  if (iv < 5) return fail(s, "interval_too_short", "측정 간격이 너무 짧아요. 5초 이상으로 정해 주세요.");
  if (iv > 60) return fail(s, "interval_too_long", "측정 간격이 너무 길면 온도 변화를 놓쳐요. 60초(1분) 이하로 정해 주세요.");
  const run: DistRun = { ...s.run, interval: iv, readings: [] };
  const state = advance(s, run, timesUntilPlateau(run, iv), ctx, "plateau");
  return ok(state, "measureUntil", `${fmtTimeKo(iv)}마다 온도를 측정했어요. 용액이 끓기 시작하자 가지 부분 온도가 더 오르지 않고 거의 일정하게 유지돼요. 지금 플라스크에서 무엇이 끓어 나오고 있을까요?`, { interval: iv, readings: state.run?.readings.length ?? 0 });
}

/** a9: 온도가 일정한 동안 얼음물 속 (  )에 어떤 변화가 생기는지 관찰한다 */
export function observeTube(s: Separation1State, step: Step, ctx: ReduceContext): Out {
  const x = eq(step, 0);
  if (x === "side_arm_flask") {
    return fail(s, "observe_flask", "플라스크 속 용액은 끓고 있어요. 이 단계에서는 기체가 모이는 얼음물 속 시험관을 관찰해요.");
  }
  if (x !== "test_tube") return fail(s, "observe_wrong_item", `${L(x)}이(가) 아니라 얼음물 속 시험관을 관찰해요.`);
  const problem = runProblem(s, "아직 가열하지 않았어요. 가열하면서 온도를 측정한 뒤에 관찰해요.", "이미 가열을 멈췄어요. 관찰은 온도가 일정하게 유지되는 동안 해요.");
  if (problem || !s.run) return problem ?? fail(s, "not_heated_yet", "아직 가열하지 않았어요.");
  if (s.run.phase !== "plateau") {
    return fail(s, "observe_before_plateau", "먼저 '온도가 일정하게 유지될 때까지 (  )마다 온도를 측정한다' 블록으로 온도가 일정한 구간을 찾아요.");
  }
  if (s.run.observed) return fail(s, "observe_already", "이미 시험관을 관찰했어요.");
  const last = s.run.readings[s.run.readings.length - 1]?.t ?? 0;
  const run: DistRun = { ...s.run, observed: true };
  const state = advance(s, run, timesObserve(run, last), ctx, "plateau");
  const seen = round1(ctx.noise(state.etube.collected, { abs: 0.2, resolution: 0.5 }));
  const m = mk(`observe.collected.t${ctx.trial}`, "관찰하는 동안 시험관에 모인 액체의 양", seen, "mL", "ethanol", ctx.trial);
  const out = ok(state, "observe", `시험관 안에 액체가 맺혀 조금씩 모이고 있어요! (약 ${fmtNum(seen)}mL) 끓어 나온 기체가 얼음물 속에서 식어 다시 액체가 되었어요.`);
  return { ...out, measurements: [m] };
}

/** a10: 온도가 다시 올라가기 시작하면 (  )을(를) 끄고 가열을 멈춘다 */
export function stopHeating(s: Separation1State, step: Step, ctx: ReduceContext): Out {
  const x = eq(step, 0);
  if (x !== "hot_plate") return fail(s, "stop_wrong_item", `가열을 멈추려면 핫플레이트를 꺼야 해요. (지금은 ${L(x)})`);
  if (!s.run) return fail(s, "not_heated_yet", "아직 가열하지 않았어요.");
  if (!s.heating) return fail(s, "stop_already", "핫플레이트는 이미 꺼져 있어요.");
  if (s.run.phase !== "plateau") return fail(s, "stop_before_plateau", "먼저 온도가 일정하게 유지되는 구간을 측정해야 해요.");
  if (!s.run.observed) {
    return fail(s, "stop_before_observe", "온도가 일정한 동안 얼음물 속 시험관에 어떤 변화가 생기는지 먼저 관찰해 보세요.");
  }
  const last = s.run.readings[s.run.readings.length - 1]?.t ?? 0;
  const advanced = advance(s, s.run, timesUntilRise(s.run, last), ctx, "stopped");
  const tStop = advanced.run?.readings[advanced.run.readings.length - 1]?.t ?? last;
  const run = advanced.run ? { ...advanced.run, tStop } : null;
  const state: Separation1State = { ...advanced, run, heating: false, vapour: false };
  const m = mk(`stop.time.t${ctx.trial}`, "가열을 멈춘 시각", tStop, "s", "mixture", ctx.trial);
  const out = ok(state, "stopHeat", `온도가 다시 올라가기 시작해서 핫플레이트를 끄고 가열을 멈췄어요 (${fmtTimeKo(tStop)}). 계속 가열하면 물도 끓어 나와 시험관의 액체에 섞여요.`);
  return { ...out, measurements: [m] };
}

/** a11: (  )에 들어 있는 액체를 확인한다 */
export function checkLiquid(s: Separation1State, step: Step, ctx: ReduceContext): Out {
  const x = eq(step, 0);
  if (x !== "test_tube" && x !== "side_arm_flask") {
    return fail(s, "check_wrong_item", `${L(x)}에는 확인할 액체가 없어요. 시험관에 모인 액체나 가지 달린 삼각플라스크에 남은 액체를 확인해요.`);
  }
  if (!s.run) {
    return s.hadRun
      ? fail(s, "check_after_cleanup", "장치를 이미 정리했어요. 액체 확인 블록은 그래프 블록보다 앞에 넣어요.")
      : fail(s, "not_heated_yet", "아직 실험을 하지 않았어요. 가열해서 분리한 뒤에 확인해요.");
  }
  if (s.heating) return fail(s, "check_while_heating", "가열하는 동안에는 확인하지 않아요. 먼저 핫플레이트를 끄고 가열을 멈춰요.");
  const which = x === "test_tube" ? "tube" : "flask";
  if (s.run.checked[which]) return fail(s, "check_already", `${L(x)}의 액체는 이미 확인했어요.`);
  const state: Separation1State = { ...s, run: { ...s.run, checked: { ...s.run.checked, [which]: true } } };
  const raw = which === "tube" ? s.etube.collected : s.flask.water + s.flask.ethanol;
  const volume = round1(ctx.noise(raw, { abs: 0.2, resolution: 0.5 }));
  const m = which === "tube"
    ? mk(`volume.collected.t${ctx.trial}`, "시험관에 모인 액체의 부피", volume, "mL", "ethanol", ctx.trial)
    : mk(`volume.remaining.t${ctx.trial}`, "플라스크에 남은 액체의 부피", volume, "mL", "water", ctx.trial);
  const note = which === "tube"
    ? `시험관에 모인 액체를 확인했어요 (약 ${fmtNum(volume)}mL). 손으로 바람을 일으켜 냄새를 맡아 보니 에탄올 냄새가 나요.`
    : `플라스크에 남은 액체를 확인했어요 (약 ${fmtNum(volume)}mL). 에탄올 냄새가 거의 나지 않아요.`;
  return { ...ok(state, "check", note, { which, volume }), measurements: [m] };
}

function plateauWindow(run: DistRun): { from: number; to: number } | null {
  const pr = run.readings.filter((r) => r.t >= run.t1 && r.t <= run.t2);
  if (pr.length === 0) return null;
  return { from: pr[0].t, to: pr[pr.length - 1].t };
}

/** a12: 시간에 따른 온도 변화를 그래프로 그려 온도가 일정한 구간을 찾는다 */
export function drawGraph(s: Separation1State, _step: Step, ctx: ReduceContext): Out {
  if (!s.run) return fail(s, "graph_no_data", "아직 측정한 온도 기록이 없어요. 가열하면서 온도를 측정해야 그래프를 그릴 수 있어요.");
  if (s.heating) return fail(s, "graph_while_heating", "온도가 다시 올라가기 시작할 때까지 측정하고, 가열을 멈춘 뒤에 그래프를 그려요.");
  const trial = ctx.trial;
  const seriesKey = `temp.mixture.t${trial}`;
  const series: Series = { key: seriesKey, trial, subject: "mixture", label: "시간에 따른 가지 부분의 온도", points: s.run.readings };
  const calc: CalcRequest = {
    key: `dist.ethanol.t${trial}`, trial, label: "처음 모인 액체가 끓어 나온 온도(평탄 구간)", unit: "°C", subject: "ethanol", inputs: [seriesKey],
  };
  const win = plateauWindow(s.run);
  const ms = win
    ? [
      mk(`plateau.start.t${trial}`, "온도가 일정해지기 시작한 시각", win.from, "s", "ethanol", trial),
      mk(`plateau.end.t${trial}`, "온도가 다시 오르기 직전 시각", win.to, "s", "ethanol", trial),
    ]
    : [];
  const span = win ? ` (${fmtTimeKo(win.from)}~${fmtTimeKo(win.to)})` : "";
  const cleaned: Separation1State = { ...initialSeparation1State(), hadRun: true };
  const note = `그래프에서 온도가 일정하게 유지되는 구간을 찾았어요${span}. 그 구간의 온도는 그래프에서 직접 읽어 표에 입력해요. 장치는 깨끗이 정리했어요.`;
  return { ...ok(cleaned, "findPlateau", note, { from: win?.from ?? null, to: win?.to ?? null }), series: [series], calcRequests: [calc], measurements: ms, endTrial: true };
}
