/**
 * 끓는점 차를 이용한 혼합물 분리 — 장치 조립 단계(a1~a6) 리듀서와 진입점.
 * 프로토타입 applyStep을 불변 상태로 이식. 가열 이후 단계(a7~a12)는 ./heating.ts.
 * 숫자는 ctx.param()/ctx.noise()로만 얻고, 오류 판단은 학생 입력·장치 상태로만 한다(dryRun 일치).
 */
import type { ReduceContext } from "../types";
import type { Step } from "../../types";
import { fmtNum, round1 } from "../../format";
import {
  CHIP_MAX, FLASK_MAX, L, eq, fail, ok, pos, quant, type Out, type Separation1State,
} from "./model";
import { checkLiquid, drawGraph, measureUntil, observeTube, startHeating, stopHeating } from "./heating";

export { initialSeparation1State, type Separation1State } from "./model";

const FLASK = "side_arm_flask";
const SETUP = ["a1", "a2", "a3", "a4", "a5", "a6"];

function wrongContainer(s: Separation1State, cont: string | null): Out {
  const why: Record<string, string> = {
    test_tube: "시험관은 기체가 식어서 모이는 곳이라 비워 둬요. 첫 번째 칸에는 가지 달린 삼각플라스크를 넣어 주세요.",
    ice_water_beaker: "얼음물 비커는 빠져나온 기체를 식히는 데 써요. 첫 번째 칸에는 가지 달린 삼각플라스크를 넣어 주세요.",
    beaker: "비커는 입구가 넓어서 끓어 나온 기체를 모을 수 없어요. 혼합물은 가지 달린 삼각플라스크에 넣어요.",
  };
  const msg = (cont && why[cont]) ?? `${L(cont)}에는 넣을 수 없어요. 첫 번째 칸에는 가지 달린 삼각플라스크를 넣어 주세요.`;
  return fail(s, "add_wrong_container", msg);
}

function addChips(s: Separation1State, q: { value: number; unit: string }): Out {
  if (q.unit !== "개") return fail(s, "chips_unit", "끓임쪽은 개수로 넣어요. 세 번째 칸에 '개' 블록을 넣어 주세요.");
  if (!Number.isInteger(q.value)) return fail(s, "chips_not_integer", "끓임쪽 개수는 1, 2, 3처럼 자연수로 입력해 주세요.");
  if (s.flask.chips + q.value > CHIP_MAX) {
    return fail(s, "chips_too_many", `끓임쪽은 2~3개면 충분해요. (지금 ${s.flask.chips}개 + ${q.value}개)`);
  }
  const state = { ...s, flask: { ...s.flask, chips: s.flask.chips + q.value } };
  return ok(state, "chips", `가지 달린 삼각플라스크에 끓임쪽 ${q.value}개를 넣었어요. 끓임쪽은 용액이 갑자기 끓어 넘치는 것을 막아 줘요.`, { count: q.value });
}

function addLiquid(s: Separation1State, sub: string, q: { value: number; unit: string }): Out {
  if (q.unit !== "mL") return fail(s, "liquid_unit", `${L(sub)}은(는) 부피를 재서 넣어요. 세 번째 칸에 mL 블록을 넣어 주세요.`);
  const tot = s.flask.water + s.flask.ethanol;
  if (tot + q.value > FLASK_MAX) {
    return fail(s, "over_capacity", `플라스크에는 ${FLASK_MAX}mL까지만 넣어요. 너무 많으면 끓을 때 넘쳐요. (지금 ${fmtNum(tot)}mL + ${fmtNum(q.value)}mL)`);
  }
  const flask = sub === "water"
    ? { ...s.flask, water: round1(s.flask.water + q.value) }
    : { ...s.flask, ethanol: round1(s.flask.ethanol + q.value) };
  return ok({ ...s, flask }, "pour", `가지 달린 삼각플라스크에 ${L(sub)} ${fmtNum(q.value)}mL를 넣었어요.`, { liquid: sub, amount: q.value });
}

/** a1: (  )에 (  )을(를) (  ) 넣는다 */
function putIn(s: Separation1State, step: Step): Out {
  const cont = eq(step, 0);
  const sub = eq(step, 1);
  const q = quant(step, 2);
  if (cont !== FLASK) return wrongContainer(s, cont);
  if (s.flask.stopper) {
    return fail(s, "add_after_stopper", "플라스크 입구가 이미 마개로 막혀 있어요. 물질은 마개로 막기 전에 넣어요.");
  }
  if (!q) return fail(s, "slot_missing", "세 번째 칸에 수치 블록을 넣어 주세요.");
  if (sub === "boiling_chips") return addChips(s, q);
  if (sub !== "water" && sub !== "ethanol") {
    return fail(s, "add_not_substance", `${L(sub)}은(는) 플라스크에 넣는 물질이 아니에요. 두 번째 칸에는 물, 에탄올, 끓임쪽 중 하나를 넣어 주세요.`);
  }
  return addLiquid(s, sub, q);
}

const hasMixture = (s: Separation1State): boolean => s.flask.water + s.flask.ethanol > 0;

/** a2: (  )의 입구를 (  )(으)로 막는다 */
function stopper(s: Separation1State, step: Step): Out {
  const x = eq(step, 0);
  const y = eq(step, 1);
  if (x !== FLASK) return fail(s, "stopper_wrong_target", "입구를 막는 건 가지 달린 삼각플라스크예요. 첫 번째 칸에 가지 달린 삼각플라스크를 넣어 주세요.");
  if (y === "thermometer") return fail(s, "stopper_thermometer_only", "온도계만으로는 입구를 막을 수 없어요. '온도계 꽂은 마개' 블록을 넣어 주세요.");
  if (y !== "stopper_thermometer") return fail(s, "stopper_wrong_item", `${L(y)}(으)로는 입구를 막을 수 없어요. 온도계 꽂은 마개를 넣어 주세요.`);
  if (!hasMixture(s)) return fail(s, "stopper_empty_flask", "플라스크가 비어 있어요. 먼저 물과 에탄올을 넣어 주세요.");
  if (s.flask.stopper) return fail(s, "stopper_already", "플라스크 입구는 이미 막혀 있어요.");
  const state = { ...s, flask: { ...s.flask, stopper: true } };
  return ok(state, "stopper", "온도계를 꽂은 마개로 플라스크 입구를 단단히 막았어요. 아직 온도계 끝의 높이는 맞추지 않았어요.");
}

/** a3: (  )을(를) (  ) 위에 올린다 */
function placeOnHot(s: Separation1State, step: Step): Out {
  const a = eq(step, 0);
  const b = eq(step, 1);
  if (b !== "hot_plate") return fail(s, "hotplate_wrong_base", `두 번째 칸에는 핫플레이트를 넣어야 해요. (지금은 ${L(b)})`);
  if (a === "ice_water_beaker") return fail(s, "hotplate_ice_beaker", "얼음물 비커는 기체를 식히는 곳이라 데우면 안 돼요.");
  if (a !== FLASK) return fail(s, "hotplate_wrong_item", `${L(a)}은(는) 핫플레이트 위에 올리지 않아요. 혼합물이 든 가지 달린 삼각플라스크를 올려 주세요.`);
  if (!hasMixture(s)) return fail(s, "hotplate_empty_flask", "플라스크가 비어 있어요. 먼저 물과 에탄올을 넣어 주세요.");
  if (s.flask.onHot) return fail(s, "hotplate_already", "플라스크는 이미 핫플레이트 위에 있어요.");
  return ok({ ...s, flask: { ...s.flask, onHot: true } }, "placeHot", "가지 달린 삼각플라스크를 핫플레이트 위에 올렸어요.");
}

/** a4: 온도계 끝이 (  )에 오도록 높이를 조절한다 */
function adjustThermo(s: Separation1State, step: Step): Out {
  const p = pos(step, 0);
  if (!s.flask.stopper) {
    return fail(s, "thermometer_no_stopper", "온도계는 마개에 꽂혀 있어요. 먼저 온도계 꽂은 마개로 플라스크 입구를 막아 주세요.");
  }
  if (p === "in_solution") {
    return fail(s, "thermometer_position", "온도계 끝이 용액 속에 있으면 끓고 있는 용액의 온도를 재게 돼요. 이 실험에서는 가지로 빠져나가는 기체의 온도를 재야 해요. 어디에 두면 좋을까요?");
  }
  if (p !== "branch") {
    return fail(s, "thermometer_position", "온도계 끝이 바닥에 닿으면 뜨거운 플라스크 바닥의 온도를 재게 되고, 온도계가 깨질 수도 있어요. 기체가 빠져나가는 곳에 맞춰 볼까요?");
  }
  if (s.thermo.adjusted) return fail(s, "thermometer_already", "온도계 높이는 이미 맞췄어요.");
  const state = { ...s, thermo: { adjusted: true, position: p } };
  return ok(state, "adjust", "온도계 끝이 플라스크의 가지가 갈라지는 부분에 오도록 높이를 맞췄어요. 가지로 빠져나가는 기체의 온도를 재야 어떤 물질이 끓어 나오는지 알 수 있어요.");
}

/** a5: (  )에 (  )을(를) 연결한다 */
function connect(s: Separation1State, step: Step): Out {
  const pair = [eq(step, 0), eq(step, 1)];
  const has = (n: string): boolean => pair.includes(n);
  if (has(FLASK) && has("rubber_tube")) {
    if (!s.flask.onHot) return fail(s, "hose_before_hotplate", "플라스크를 먼저 핫플레이트 위 제자리에 올린 뒤 가지에 고무관을 끼워요.");
    if (s.flask.hose) return fail(s, "connect_already", "고무관은 이미 연결되어 있어요.");
    return ok({ ...s, flask: { ...s.flask, hose: true } }, "connect", "플라스크의 가지에 고무관을 끼웠어요.", { what: "hose" });
  }
  if (has("rubber_tube") && has("glass_tube")) {
    if (!s.flask.hose) return fail(s, "glass_before_hose", "고무관을 먼저 플라스크의 가지에 끼워야 해요.");
    if (s.flask.glass) return fail(s, "connect_already", "유리관은 이미 연결되어 있어요.");
    return ok({ ...s, flask: { ...s.flask, glass: true } }, "connect", "고무관 반대쪽 끝에 유리관을 연결했어요.", { what: "glass" });
  }
  if (has(FLASK) && has("glass_tube")) {
    return fail(s, "connect_glass_to_flask", "가지에는 고무관을 먼저 끼우고, 고무관 반대쪽 끝에 유리관을 연결해요.");
  }
  return fail(s, "connect_invalid", `${L(pair[0])}에 ${L(pair[1])}을(를) 연결할 수 없어요. 가지 달린 삼각플라스크–고무관, 고무관–유리관을 연결해요.`);
}

function insertTube(s: Separation1State): Out {
  if (s.etube.inCold) return fail(s, "tube_already_cold", "시험관은 이미 얼음물 비커 속에 있어요.");
  return ok({ ...s, etube: { ...s.etube, inCold: true } }, "insertEtube", "빈 시험관을 얼음물이 담긴 비커 속에 넣었어요.");
}

function insertGlass(s: Separation1State): Out {
  if (!s.flask.glass) return fail(s, "glass_not_connected", "유리관이 아직 고무관에 연결되지 않았어요. 고무관 끝에 유리관을 먼저 연결해요.");
  if (!s.etube.inCold) return fail(s, "tube_not_cold", "시험관을 먼저 얼음물 비커 속에 넣어 두세요.");
  if (s.flask.glassIn) return fail(s, "glass_already_in", "유리관은 이미 시험관 속에 들어 있어요.");
  const state = { ...s, flask: { ...s.flask, glassIn: true } };
  return ok(state, "insertGlass", "유리관 끝을 얼음물 속 빈 시험관에 넣었어요. 플라스크에서 나온 기체가 여기서 식어 다시 액체로 모일 거예요.");
}

/** a6: (  )을(를) (  ) 속에 넣는다 */
function insertInto(s: Separation1State, step: Step): Out {
  const x = eq(step, 0);
  const y = eq(step, 1);
  if (x === "test_tube" && y === "ice_water_beaker") return insertTube(s);
  if (x === "glass_tube" && y === "test_tube") return insertGlass(s);
  if (x === "test_tube" && y === "beaker") {
    return fail(s, "tube_plain_beaker", "그냥 비커가 아니라 얼음물 비커 속에 넣어야 해요. 차갑게 식혀야 기체가 다시 액체로 모여요.");
  }
  if (x === "glass_tube" && y === "ice_water_beaker") {
    return fail(s, "glass_into_ice", "유리관 끝은 얼음물 비커 속의 시험관 안에 넣어야 기체가 식어서 시험관에 모여요.");
  }
  if (x === "thermometer") {
    return fail(s, "thermometer_into", "온도계는 마개에 꽂혀 있어요. 높이는 '온도계 끝이 (  )에 오도록 높이를 조절한다' 블록으로 맞춰요.");
  }
  return fail(s, "insert_invalid", `${L(x)}을(를) ${L(y)} 속에 넣을 수 없어요. 시험관은 얼음물 비커 속에, 유리관은 시험관 속에 넣어요.`);
}

type Handler = (s: Separation1State, step: Step, ctx: ReduceContext) => Out;

const HANDLERS: Record<string, Handler> = {
  a1: putIn,
  a2: stopper,
  a3: placeOnHot,
  a4: adjustThermo,
  a5: connect,
  a6: insertInto,
  a7: startHeating,
  a8: measureUntil,
  a9: observeTube,
  a10: stopHeating,
  a11: checkLiquid,
  a12: drawGraph,
};

export function reduceSeparation1(s: Separation1State, step: Step, ctx: ReduceContext): Out {
  if (SETUP.includes(step.action) && s.run) {
    return s.heating
      ? fail(s, "setup_while_heating", "이미 가열 중이에요. 실험 장치는 핫플레이트를 켜기 전에 모두 준비해야 해요.")
      : fail(s, "setup_after_run", "이번 실험은 이미 끝났어요. '그래프로 그려 온도가 일정한 구간을 찾는다' 블록으로 정리한 뒤에 새 실험을 처음부터 조립해요.");
  }
  const h = HANDLERS[step.action];
  return h ? h(s, step, ctx) : fail(s, "unknown_block", "이 실험에서 쓸 수 없는 블록이에요.");
}
