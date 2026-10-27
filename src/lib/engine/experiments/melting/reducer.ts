/**
 * 녹는점 측정 리듀서 — 프로토타입 melting_point_lab.html의 applyStep을 불변 상태로 이식.
 * 숫자는 ctx.param()/ctx.noise()로만 얻는다(dryRun에서는 NaN). 오류 판단은 학생 입력과 상태 플래그로만 한다.
 */
import type { ReduceContext } from "../types";
import type { Step } from "../../types";
import { fmtNum, round1 } from "../../format";
import {
  BKR_MAX, L, TUBE_MAX_G, eq, immersed, isSample, quant, waterNeeded,
  type MeltingState,
} from "./model";
import { fail, ok, type Out } from "./outcome";
import { findMeltingPoint, heat, measureMore, measureUntilMelted } from "./measure";

export { initialMeltingState, type MeltingState } from "./model";

const SETUP_ACTIONS = ["a1", "a2", "a3", "a4", "a5"];

function putIntoTube(s: MeltingState, sub: string | null, q: { value: number; unit: string }): Out {
  if (sub === "water") {
    return fail(s, "tube_water", "시험관에는 녹는점을 잴 고체(로르산 또는 팔미트산)를 넣어요. 물은 비커에 넣어 시험관을 데우는 데 써요.");
  }
  if (!isSample(sub)) {
    return fail(s, "tube_not_sample", `${L(sub)}은(는) 시험관에 넣는 물질이 아니에요. 두 번째 칸에는 로르산이나 팔미트산을 넣어 주세요.`);
  }
  if (q.unit !== "g") return fail(s, "tube_need_grams", "고체는 전자저울로 질량(g)을 재서 넣어요. 세 번째 칸에 g 단위의 수치 블록을 넣어 주세요.");
  if (s.tube.sub && s.tube.sub !== sub) {
    return fail(s, "tube_mixed", `시험관에 이미 ${L(s.tube.sub)}이(가) 들어 있어요. 한 시험관에는 한 가지 물질만 넣어요.`);
  }
  if (s.tube.fixed) return fail(s, "tube_after_fixed", "물질은 시험관을 스탠드에 고정하기 전에 넣어요.");
  if (s.tube.mass + q.value > TUBE_MAX_G) {
    return fail(s, "tube_over_capacity", `시험관에는 ${TUBE_MAX_G}g까지만 넣을 수 있어요. 이 실험에서는 5g 정도를 넣어요. (현재 ${fmtNum(s.tube.mass)}g + ${fmtNum(q.value)}g)`);
  }
  const state: MeltingState = {
    ...s,
    tube: { ...s.tube, sub, mass: round1(s.tube.mass + q.value) },
    shown: { ...s.shown, tube: true },
  };
  return ok(state, "pour", `시험관에 ${L(sub)}을(를) ${fmtNum(q.value)} g 넣었어요.`, { container: "test_tube", sub, amount: q.value, unit: "g" });
}

function putIntoBeaker(s: MeltingState, sub: string | null, q: { value: number; unit: string }): Out {
  if (isSample(sub)) {
    return fail(s, "beaker_sample", `${L(sub)}을(를) 비커에 넣고 직접 가열하지 않아요. 고체는 시험관에 넣고, 비커에는 물을 넣어 물중탕으로 서서히 가열해요.`);
  }
  if (sub !== "water") return fail(s, "beaker_not_water", `${L(sub)}은(는) 비커에 넣는 물질이 아니에요. 두 번째 칸에는 물을 넣어 주세요.`);
  if (q.unit !== "mL") return fail(s, "beaker_need_ml", "물은 부피(mL)로 재서 넣어요. 세 번째 칸에 mL 단위의 수치 블록을 넣어 주세요.");
  if (s.bkr.volume + q.value > BKR_MAX) {
    return fail(s, "beaker_over_capacity", `비커에는 ${BKR_MAX}mL까지만 넣을 수 있어요. 절반 정도(약 125mL)면 충분해요. (현재 ${fmtNum(s.bkr.volume)}mL + ${fmtNum(q.value)}mL)`);
  }
  const state: MeltingState = {
    ...s,
    bkr: { ...s.bkr, water: true, volume: round1(s.bkr.volume + q.value) },
    shown: { ...s.shown, bkr: true },
  };
  return ok(state, "pour", `비커에 물을 ${fmtNum(q.value)} mL 넣었어요.`, { container: "beaker", sub, amount: q.value, unit: "mL" });
}

function putInto(s: MeltingState, step: Step): Out {
  const cont = eq(step, 0);
  const sub = eq(step, 1);
  const q = quant(step, 2) ?? { value: Number.NaN, unit: "" };
  if (cont === "test_tube") return putIntoTube(s, sub, q);
  if (cont === "beaker") return putIntoBeaker(s, sub, q);
  return fail(s, "put_not_container", `${L(cont)}에는 물질을 넣지 않아요. 첫 번째 칸에는 시험관이나 비커를 넣어 주세요.`);
}

function placeOnHotPlate(s: MeltingState, step: Step): Out {
  const a = eq(step, 0);
  const b = eq(step, 1);
  if (b !== "hot_plate") return fail(s, "place_not_hot_plate", `두 번째 칸에는 핫플레이트를 넣어야 해요. (지금은 ${L(b)})`);
  if (a === "test_tube") {
    return fail(s, "tube_on_hot_plate", "시험관은 핫플레이트에 직접 올리지 않아요. 직접 가열하면 온도가 너무 빨리 올라 녹는점을 정확히 재기 어려워요. 물이 든 비커에 담가 물중탕으로 서서히 가열해요.");
  }
  if (a !== "beaker") return fail(s, "place_not_beaker", `${L(a)}은(는) 핫플레이트 위에 올리지 않아요. 물이 든 비커를 올려 주세요.`);
  if (!s.bkr.water) return fail(s, "beaker_empty", "비커가 비어 있어요. 먼저 비커에 물을 절반 정도 넣어 주세요.");
  if (s.bkr.onHot) return fail(s, "beaker_already_on", "비커는 이미 핫플레이트 위에 있어요.");
  const state: MeltingState = { ...s, bkr: { ...s.bkr, onHot: true }, shown: { ...s.shown, hot: true } };
  return ok(state, "placeHot", "물이 든 비커를 핫플레이트 위에 올렸어요.");
}

function fixTube(s: MeltingState, step: Step): Out {
  const x = eq(step, 0);
  if (x === "thermometer") {
    return fail(s, "fix_thermometer", "온도계는 스탠드에 고정하지 않고 시험관 속 물질에 꽂아요. '(  )을(를) (  ) 속에 꽂는다' 블록을 써 보세요.");
  }
  if (x === "beaker") return fail(s, "fix_beaker", "비커는 핫플레이트 위에 올려요. 스탠드에는 물질이 든 시험관을 고정해요.");
  if (x !== "test_tube") return fail(s, "fix_not_tube", `${L(x)}은(는) 스탠드에 고정하지 않아요. 첫 번째 칸에 시험관을 넣어 주세요.`);
  if (!s.tube.sub) return fail(s, "fix_tube_empty", "시험관에 먼저 로르산이나 팔미트산을 넣어 주세요.");
  if (!s.bkr.onHot || !s.bkr.water) {
    return fail(s, "fix_no_bath", "물이 든 비커를 먼저 핫플레이트 위에 올려야 시험관을 물속에 담글 수 있어요.");
  }
  if (!immersed(s.bkr.volume, s.tube.mass)) {
    return fail(s, "not_immersed", `비커의 물이 ${fmtNum(s.bkr.volume)}mL뿐이라 시험관 속 ${L(s.tube.sub)}이(가) 물에 충분히 잠기지 않아요. 비커에 물을 ${waterNeeded(s.tube.mass)}mL 이상(절반 정도) 넣어 주세요.`);
  }
  if (s.tube.fixed) return fail(s, "tube_already_fixed", "시험관은 이미 스탠드에 고정되어 있어요.");
  const state: MeltingState = { ...s, tube: { ...s.tube, fixed: true }, shown: { ...s.shown, stand: true } };
  return ok(state, "fixTube", `${L(s.tube.sub)}이(가) 든 시험관을 비커 속 물에 충분히 잠기도록 스탠드에 고정했어요.`);
}

function insertProblem(s: MeltingState, x: string | null, y: string | null): Out | null {
  if (x !== "thermometer") return fail(s, "insert_not_thermometer", "꽂는 것은 온도계예요. 첫 번째 칸에 온도계를 넣어 주세요.");
  if (y === "water" || y === "beaker") {
    return fail(s, "thermo_in_water", "비커 속 물의 온도가 아니라 시험관 속 고체 물질의 온도를 재야 해요. 두 번째 칸에 시험관에 넣은 물질을 넣어 주세요.");
  }
  if (y === "test_tube") {
    return fail(s, "thermo_in_tube", "온도계는 시험관 안의 물질(로르산 또는 팔미트산) 속에 꽂아요. 두 번째 칸에 물질 이름을 넣어 주세요.");
  }
  if (!isSample(y)) return fail(s, "insert_not_sample", `${L(y)} 속에는 온도계를 꽂지 않아요. 두 번째 칸에 시험관에 넣은 물질을 넣어 주세요.`);
  if (!s.tube.sub) return fail(s, "insert_tube_empty", "시험관에 먼저 물질을 넣어 주세요.");
  if (y !== s.tube.sub) return fail(s, "insert_wrong_sample", `시험관에 들어 있는 물질은 ${L(s.tube.sub)}이에요. 그 물질 속에 꽂아 볼까요?`);
  if (!s.tube.fixed) return fail(s, "insert_before_fix", "시험관을 먼저 비커 속 물에 잠기도록 스탠드에 고정한 뒤 온도계를 꽂아요.");
  if (s.thermo.in) return fail(s, "thermo_already_in", "온도계는 이미 꽂혀 있어요.");
  return null;
}

function insertThermometer(s: MeltingState, step: Step): Out {
  const x = eq(step, 0);
  const y = eq(step, 1);
  const problem = insertProblem(s, x, y);
  if (problem) return problem;
  const state: MeltingState = { ...s, thermo: { in: true, adjusted: false } };
  return ok(state, "insertThermo", `온도계를 ${L(y)} 속에 꽂았어요.`, { sub: y });
}

function adjustThermometer(s: MeltingState, step: Step): Out {
  const x = eq(step, 0);
  if (x === "water") {
    return fail(s, "adjust_water", "온도계 끝은 시험관 속 고체 물질의 한가운데에 맞춰요. 비커의 물은 시험관을 데우는 용도예요.");
  }
  if (!isSample(x)) return fail(s, "adjust_not_sample", "온도계 끝은 온도를 잴 물질(로르산 또는 팔미트산)의 한가운데에 맞춰요.");
  if (!s.thermo.in) return fail(s, "adjust_no_thermometer", "아직 온도계를 꽂지 않았어요. 먼저 온도계를 시험관 속 물질에 꽂아 주세요.");
  if (x !== s.tube.sub) {
    return fail(s, "adjust_wrong_sample", `온도계는 ${L(s.tube.sub)} 속에 꽂혀 있어요. ${L(s.tube.sub)}의 한가운데에 맞춰 볼까요?`);
  }
  if (s.thermo.adjusted) return fail(s, "adjust_already", "온도계 높이는 이미 맞췄어요.");
  const state: MeltingState = { ...s, thermo: { ...s.thermo, adjusted: true } };
  return ok(state, "adjust", `온도계 끝이 ${L(x)}의 한가운데에 오도록 높이를 맞췄어요.`, { sub: x });
}

type Handler = (s: MeltingState, step: Step, ctx: ReduceContext) => Out;

const HANDLERS: Record<string, Handler> = {
  a1: putInto,
  a2: placeOnHotPlate,
  a3: fixTube,
  a4: insertThermometer,
  a5: adjustThermometer,
  a6: heat,
  a7: measureUntilMelted,
  a8: measureMore,
  a9: findMeltingPoint,
};

export function reduceMelting(s: MeltingState, step: Step, ctx: ReduceContext): Out {
  if (SETUP_ACTIONS.includes(step.action) && s.heating) {
    return fail(s, "setup_while_heating", "이미 가열 중이에요. 실험 장치는 핫플레이트를 켜기 전에 모두 준비해야 해요.");
  }
  const h = HANDLERS[step.action];
  return h ? h(s, step, ctx) : fail(s, "unknown_block", "이 실험에서 쓸 수 없는 블록이에요.");
}
