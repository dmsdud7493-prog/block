/**
 * 재결정 리듀서 (2) — 거름 장치·거르기·결과 확인·말린 결정 질량 (프로토타입 applyStep a6~a9 이식).
 * 결과 확인(a8)에서 결과 표 측정값(물·넣은 양·온도)과 석출량 계산 칸(CalcRequest)을 만든다.
 */
import type { ReduceContext } from "../types";
import type { CalcRequest, Measurement, Step } from "../../types";
import { fixJosa, fmtNum, round2 } from "../../format";
import {
  L, eq, fail, freshIfChecked, newBeaker, sceneOf,
  type Out, type Pair, type Separation2State,
} from "./model";

const ok = (state: Separation2State, type: string, note: string, extra: Record<string, unknown> = {}): Out => ({
  state,
  event: { type, note: fixJosa(note), ...extra, scene: sceneOf(state) },
});

export function setupFilter(s0: Separation2State, step: Step): Out {
  const s = freshIfChecked(s0);
  const stand = eq(step, 0);
  const funnel = eq(step, 1);
  const paper = eq(step, 2);
  if (stand !== "stand") return fail(s, "setup_not_stand", `첫 번째 칸에는 깔때기를 고정할 스탠드를 넣어 주세요. (지금은 ${L(stand)})`);
  if (funnel !== "funnel") return fail(s, "setup_not_funnel", `두 번째 칸에는 깔때기를 넣어 주세요. (지금은 ${L(funnel)})`);
  if (paper !== "filter_paper") return fail(s, "setup_not_paper", `세 번째 칸에는 깔때기에 깔 거름종이를 넣어 주세요. (지금은 ${L(paper)})`);
  if (s.filter.ready) return fail(s, "setup_already", "거름 장치는 이미 설치되어 있어요.");
  const state = { ...s, filter: { ...s.filter, ready: true }, shown: { ...s.shown, filter: true } };
  return ok(state, "setup", "스탠드에 깔때기를 설치하고 거름종이를 깔았어요.");
}

export function pourFilter(s: Separation2State, step: Step): Out {
  const b = s.bkr;
  const item = eq(step, 0);
  const f = s.filter;
  if (item !== "beaker") return fail(s, "pour_not_beaker", `${L(item)}에는 거를 내용물이 없어요. 첫 번째 칸에는 용액이 든 비커를 넣어 주세요.`);
  if (eq(step, 1) !== "glass_rod") return fail(s, "pour_no_rod", "용액이 튀거나 넘치지 않도록 유리 막대를 따라 부어요. 두 번째 칸에 유리 막대를 넣어 주세요.");
  if (!f.ready) return fail(s, "filter_not_ready", "아직 거름 장치가 없어요. 먼저 스탠드에 깔때기를 설치하고 거름종이를 깔아 주세요.");
  if (f.done) return fail(s, "filter_already", "이미 걸렀어요. 거름종이 위의 물질과 걸러진 용액을 확인해 보세요.");
  if (b.water <= 0) return fail(s, "pour_nothing", "비커에 거를 내용물이 없어요. 먼저 비커에 물과 혼합물을 넣어 주세요.");
  const paper: Pair = { boric_acid: round2(b.undis.boric_acid + b.xtal.boric_acid), cuso4: round2(b.undis.cuso4 + b.xtal.cuso4) };
  const fdis: Pair = { ...b.dis };
  const filter = { ...f, paper, fdis, fw: b.water, fT: b.T, cooled: s.cooled, hotT: s.hotT, done: true };
  const state: Separation2State = {
    ...s, filter, bkr: newBeaker(b.T), inBath: false, thermo: false, shown: { ...s.shown, bath: false },
  };
  const out = ok(state, "filter", "비커의 내용물을 유리 막대를 따라 깔때기에 천천히 부었어요. 거름종이 아래로 용액이 똑똑 떨어져요.", { paper: { ...paper }, fdis: { ...fdis }, fw: b.water, cooled: s.cooled });
  // 프로토타입처럼 "식히지 않고 바로 거르기"는 비교 시도로 허용하되 알려 준다 (지침 3.3)
  if (s.cooled) return out;
  return { ...out, warnings: [{ code: "filter_before_cool", message: "식히지 않고 바로 걸렀어요. 식혀서 거른 결과와 비교해 보면 무엇이 다를까요?", guideline: "3.3" }] };
}

function verdictOf(f: Separation2State["filter"]): { ok: boolean; verdict: string } {
  const pB = f.paper.boric_acid;
  const pC = f.paper.cuso4;
  if (pB > 0 && !(pC > 0)) return { ok: true, verdict: "붕산만 순수하게 걸러냈어요! 분리 성공 🎉" };
  if (pB > 0 && pC > 0) return { ok: false, verdict: "황산 구리(II)도 결정으로 나와 붕산과 섞였어요. 황산 구리(II)의 양이 많았던 것 같아요. 양을 바꿔 다시 해 볼까요?" };
  if (!(pC > 0)) {
    return { ok: false, verdict: f.cooled ? "거름종이 위에 남은 것이 없어요. 붕산의 양이 적어서 식혀도 모두 녹아 있었어요." : "거름종이 위에 남은 것이 없어요. 용액을 식히지 않아서 결정이 생기지 않았어요." };
  }
  return { ok: false, verdict: "붕산이 아니라 황산 구리(II)가 걸러졌어요. 넣은 양을 다시 확인해 보세요." };
}

const mk = (key: string, trial: number, label: string, value: number, unit: Measurement["unit"], subject: string): Measurement =>
  ({ key, trial, label, value, unit, subject });

/** 결과 표에 옮기는 측정값 — 물의 질량, 넣은 양, 녹인 온도, 식힌 온도 */
function resultMeasurements(s: Separation2State, trial: number): Measurement[] {
  const f = s.filter;
  const base = [
    mk(`water.t${trial}`, trial, "물의 질량", f.fw, "g", "water"),
    mk(`added.boric_acid.t${trial}`, trial, "넣은 붕산의 양", s.added.boric_acid, "g", "boric_acid"),
    mk(`added.cuso4.t${trial}`, trial, "넣은 황산 구리(II)의 양", s.added.cuso4, "g", "cuso4"),
  ];
  const hot = f.hotT === null ? [] : [mk(`temp.hot.t${trial}`, trial, "녹인 용액의 온도", f.hotT, "°C", "solution")];
  const cold = f.cooled && f.fT !== null ? [mk(`temp.cold.t${trial}`, trial, "식힌 용액의 온도", f.fT, "°C", "solution")] : [];
  const dried = s.weighed === null ? [] : [mk(`crystal_mass.t${trial}`, trial, "말린 결정의 질량", s.weighed, "g", "crystal")];
  return [...base, ...hot, ...cold, ...dried];
}

function precipRequest(s: Separation2State, trial: number): CalcRequest[] {
  if (!(s.added.boric_acid > 0) || !s.filter.cooled) return [];
  return [{
    key: `precip.boric_acid.t${trial}`,
    trial,
    label: "석출되는 붕산의 양(이론값)",
    unit: "g",
    subject: "boric_acid",
    inputs: [`added.boric_acid.t${trial}`, `water.t${trial}`, `temp.cold.t${trial}`],
  }];
}

export function checkResult(s: Separation2State, ctx: ReduceContext): Out {
  const f = s.filter;
  if (!f.done) {
    return f.ready
      ? fail(s, "check_not_filtered", "아직 거르지 않았어요. 먼저 비커의 내용물을 유리 막대를 따라 깔때기에 부어 주세요.")
      : fail(s, "check_not_filtered", "아직 거르지 않았어요. 거름 장치를 설치하고 비커의 내용물을 부어 걸러야 해요.");
  }
  if (s.checked) return fail(s, "check_already", "이 결과는 이미 확인했어요.");
  const { ok: separated, verdict } = verdictOf(f);
  const state: Separation2State = { ...s, checked: true, resultTrial: ctx.trial };
  const out = ok(state, "check", `거름종이 위의 물질과 걸러진 용액을 확인했어요. ${verdict}`, {
    trial: ctx.trial, paper: { ...f.paper }, fdis: { ...f.fdis }, fw: f.fw, fT: f.fT, hotT: f.hotT,
    cooled: f.cooled, added: { ...s.added }, ok: separated, verdict, weighed: s.weighed,
  });
  return { ...out, measurements: resultMeasurements(s, ctx.trial), calcRequests: precipRequest(s, ctx.trial), endTrial: true };
}

/**
 * 선택 블록: 말린 결정의 질량. 결과 확인(a8) 뒤에 오면 그 시도(resultTrial)에 붙는다
 * — 엔진의 시도 번호는 a8에서 이미 넘어갔으므로 ctx.trial 대신 resultTrial을 쓴다.
 */
export function weighCrystals(s: Separation2State, step: Step, ctx: ReduceContext): Out {
  const f = s.filter;
  if (eq(step, 0) !== "filter_paper") return fail(s, "weigh_not_paper", `첫 번째 칸에는 결정이 걸러진 거름종이를 넣어 주세요. (지금은 ${L(eq(step, 0))})`);
  if (eq(step, 1) !== "scale") return fail(s, "weigh_not_scale", "질량은 전자저울로 재요. 두 번째 칸에 전자저울을 넣어 주세요.");
  if (!f.done) return fail(s, "weigh_not_filtered", "아직 거르지 않아서 거름종이 위에 결정이 없어요.");
  if (s.weighed !== null) return fail(s, "weigh_already", "말린 결정의 질량은 이미 측정했어요.");
  const raw = f.paper.boric_acid + f.paper.cuso4;
  if (raw <= 0) return fail(s, "weigh_nothing", "거름종이 위에 남은 결정이 없어요.");
  const mass = round2(ctx.noise(raw, { abs: 0.01, resolution: 0.01 }));
  const trial = s.resultTrial ?? ctx.trial;
  const state: Separation2State = { ...s, scale: mass, weighed: mass, shown: { ...s.shown, scale: true } };
  const measurement = s.checked ? [mk(`crystal_mass.t${trial}`, trial, "말린 결정의 질량", mass, "g", "crystal")] : [];
  return { ...ok(state, "weigh", `거름종이 위의 결정을 말려 전자저울에 올렸어요: ${fmtNum(mass)} g`, { trial, mass }), measurements: measurement };
}
