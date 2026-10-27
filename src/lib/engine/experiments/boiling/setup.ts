/**
 * 끓는점 측정 — 장치 준비 블록(a1~a7) 리듀서. 프로토타입 applyStep의 규칙과 문구를 불변 상태로 이식.
 * 이 블록들은 물성 수치를 쓰지 않는다(용량은 학생이 끼운 수치 블록 값).
 */
import type { ReduceContext } from "../types";
import type { Step } from "../../types";
import { fmtNum, round1 } from "../../format";
import {
  BATH_MIN, BKR_MAX, TUBE_MAX, eq, fail, isLiquid, L, okOut, volumeOf,
  type BoilingState, type Out,
} from "./model";

const STOPPER_BLOCK = "'(  )의 입구를 (  )(으)로 막는다'";

function fillNotContainer(s: BoilingState, cont: string | null): Out {
  if (cont === "empty_tube") {
    return fail(s, "fill_empty_tube", "빈 시험관은 에탄올 증기가 식어서 모이는 곳이라 비워 둬요. 첫 번째 칸에는 비커나 가지 달린 시험관을 넣어 주세요.");
  }
  if (cont === "cold_water_beaker") {
    return fail(s, "fill_cold_beaker", "찬물 비커에는 이미 찬물이 들어 있어요. 증기를 식히는 데 쓰는 거예요. 첫 번째 칸에는 비커나 가지 달린 시험관을 넣어 주세요.");
  }
  return fail(s, "fill_not_container", `${L(cont)}에는 액체를 넣을 수 없어요. 첫 번째 칸에는 비커나 가지 달린 시험관을 넣어 주세요.`);
}

/** a1 — (  )에 (  )을(를) (  ) 넣는다 */
export function fill(s: BoilingState, step: Step): Out {
  const cont = eq(step, 0);
  const sub = eq(step, 1);
  const amt = volumeOf(step, 2);
  if (cont !== "beaker" && cont !== "side_arm_tube") return fillNotContainer(s, cont);
  if (!isLiquid(sub)) return fail(s, "fill_not_liquid", `${L(sub)}은(는) 넣는 물질이 아니에요. 두 번째 칸에는 물이나 에탄올을 넣어 주세요.`);
  if (cont === "beaker" && sub === "ethanol") {
    return fail(s, "ethanol_direct_heat", "에탄올은 불이 붙기 쉬워서 비커에 담아 핫플레이트로 직접 가열하면 위험해요. 에탄올은 가지 달린 시험관에 넣어 물중탕으로 가열해요.");
  }
  if (cont === "side_arm_tube" && sub === "water") {
    return fail(s, "water_in_side_arm", "이 실험에서 가지 달린 시험관에는 에탄올을 넣어요. 물의 끓는점은 비커에 물을 넣고 직접 가열해서 재요.");
  }
  const c = cont === "beaker" ? s.bkr : s.tube;
  const max = cont === "beaker" ? BKR_MAX : TUBE_MAX;
  if (c.volume + amt > max) {
    return fail(s, "over_capacity", `${L(cont)}에는 ${max}mL까지만 넣을 수 있어요. (현재 ${fmtNum(c.volume)}mL + ${fmtNum(amt)}mL)`);
  }
  const volume = round1(c.volume + amt);
  const state: BoilingState = cont === "beaker"
    ? { ...s, bkr: { ...s.bkr, liquid: sub, volume }, shown: { ...s.shown, bkr: true } }
    : { ...s, tube: { ...s.tube, liquid: sub, volume }, shown: { ...s.shown, tube: true } };
  return okOut(state, "pour", `${L(cont)}에 ${L(sub)} ${fmtNum(amt)}mL를 넣었어요.`, { container: cont, liquid: sub, amount: amt });
}

/** a2 — (  )을(를) (  ) 위에 올린다 */
export function placeOnHotPlate(s: BoilingState, step: Step): Out {
  const a = eq(step, 0);
  const b = eq(step, 1);
  if (b !== "hot_plate") return fail(s, "place_not_hot_plate", `두 번째 칸에는 핫플레이트를 넣어야 해요. (지금은 ${L(b)})`);
  if (a === "side_arm_tube") {
    return fail(s, "ethanol_direct_heat", "가지 달린 시험관은 핫플레이트에 직접 올리지 않아요. 에탄올은 불이 붙기 쉬워서 물이 든 비커에 담가 물중탕으로 가열해요.");
  }
  if (a !== "beaker") return fail(s, "place_not_beaker", `${L(a)}은(는) 핫플레이트 위에 올리지 않아요. 물이 든 비커를 올려 주세요.`);
  if (!s.bkr.volume) return fail(s, "place_empty_beaker", "비커가 비어 있어요. 먼저 비커에 물을 넣어 주세요.");
  if (s.bkr.onHot) return fail(s, "already_on_hot_plate", "비커는 이미 핫플레이트 위에 있어요.");
  const state = { ...s, bkr: { ...s.bkr, onHot: true }, shown: { ...s.shown, hot: true } };
  return okOut(state, "placeHot", "물이 든 비커를 핫플레이트 위에 올렸어요.");
}

function fixThermometer(s: BoilingState): Out {
  if (s.tube.liquid) {
    return fail(s, "thermo_use_stopper", `에탄올 실험에서는 온도계를 마개에 꽂아 시험관 입구를 막아요. ${STOPPER_BLOCK} 블록을 써 보세요.`);
  }
  if (!s.bkr.onHot) return fail(s, "fix_thermo_no_beaker", "물이 든 비커를 먼저 핫플레이트 위에 올려야 그 위에 온도계를 설치할 수 있어요.");
  if (s.thermo.where === "bkr") return fail(s, "already_fixed", "온도계는 이미 스탠드에 고정되어 있어요.");
  const state: BoilingState = { ...s, thermo: { where: "bkr", adjusted: false }, shown: { ...s.shown, stand: true } };
  return okOut(state, "fixThermo", "온도계를 스탠드에 고정했어요. 아직 온도계 끝이 물에 닿지 않았어요. 높이를 맞춰야 해요.");
}

function fixSideArmTube(s: BoilingState): Out {
  if (s.tube.liquid !== "ethanol") return fail(s, "fix_tube_no_ethanol", "가지 달린 시험관에 먼저 에탄올을 넣어 주세요.");
  if (s.thermo.where === "bkr") {
    return fail(s, "fix_tube_water_setup", "비커에 이미 물의 끓는점을 재는 온도계가 설치되어 있어요. 물 실험과 에탄올 실험은 따로 해요.");
  }
  if (!s.bkr.onHot || s.bkr.liquid !== "water") {
    return fail(s, "fix_tube_no_bath", "물이 든 비커를 먼저 핫플레이트 위에 올려야 시험관을 물중탕으로 담글 수 있어요.");
  }
  if (s.bkr.volume < BATH_MIN) {
    return fail(s, "bath_too_shallow", `비커의 물이 ${fmtNum(s.bkr.volume)}mL뿐이라 시험관 아랫부분이 충분히 잠기지 않아요. 비커에 물을 ${BATH_MIN}mL 이상 넣어 주세요.`);
  }
  if (s.tube.fixed) return fail(s, "already_fixed", "가지 달린 시험관은 이미 스탠드에 고정되어 있어요.");
  const state = { ...s, tube: { ...s.tube, fixed: true }, shown: { ...s.shown, stand: true } };
  return okOut(state, "fixTube", "가지 달린 시험관의 아랫부분이 비커 속 물에 충분히 잠기도록 스탠드에 고정했어요. (물중탕)");
}

/** a3 — (  )을(를) 스탠드에 고정한다 */
export function fixToStand(s: BoilingState, step: Step): Out {
  const x = eq(step, 0);
  if (x === "thermometer") return fixThermometer(s);
  if (x === "side_arm_tube") return fixSideArmTube(s);
  if (x === "stopper_thermometer") return fail(s, "fix_stopper", "마개는 스탠드에 고정하지 않고 가지 달린 시험관 입구를 막는 데 써요.");
  return fail(s, "fix_not_allowed", `${L(x)}은(는) 스탠드에 고정하지 않아요. 온도계나 가지 달린 시험관을 넣어 주세요.`);
}

/** a4 — (  )의 입구를 (  )(으)로 막는다 */
export function stopTube(s: BoilingState, step: Step): Out {
  const x = eq(step, 0);
  const y = eq(step, 1);
  if (x !== "side_arm_tube") return fail(s, "stopper_wrong_tube", "입구를 막는 건 가지 달린 시험관이에요. 첫 번째 칸에 가지 달린 시험관을 넣어 주세요.");
  if (y === "thermometer") return fail(s, "stopper_thermo_only", "온도계만으로는 입구를 막을 수 없어요. '온도계 꽂은 마개' 블록을 넣어 주세요.");
  if (y !== "stopper_thermometer") return fail(s, "stopper_wrong_item", `${L(y)}(으)로는 입구를 막을 수 없어요. 온도계 꽂은 마개를 넣어 주세요.`);
  if (!s.tube.liquid) return fail(s, "stopper_no_ethanol", "가지 달린 시험관에 먼저 에탄올을 넣어 주세요.");
  if (!s.tube.fixed) return fail(s, "stopper_before_fix", "가지 달린 시험관을 먼저 스탠드에 고정한 뒤 입구를 막아요.");
  if (s.tube.stopper) return fail(s, "already_stoppered", "시험관 입구는 이미 막혀 있어요.");
  const state: BoilingState = { ...s, tube: { ...s.tube, stopper: true }, thermo: { where: "tube", adjusted: false } };
  return okOut(state, "stopper", "온도계를 꽂은 마개로 시험관 입구를 막았어요. 이제 온도계 끝의 높이를 맞춰 볼까요?");
}

/** a5 — 온도계 끝이 (  )의 한가운데에 오도록 높이를 조절한다 */
export function adjustThermometer(s: BoilingState, step: Step): Out {
  const liq = eq(step, 0);
  if (!isLiquid(liq)) return fail(s, "thermo_target_not_liquid", "온도계 끝은 온도를 잴 액체(물 또는 에탄올)의 한가운데에 맞춰요.");
  if (!s.thermo.where) return fail(s, "thermo_not_installed", "아직 온도계를 설치하지 않았어요. 먼저 온도계를 설치해 주세요.");
  if (s.thermo.where === "bkr" && liq !== "water") {
    return fail(s, "thermo_position_wrong", "온도계는 비커 속 물에 들어 있어요. 물의 한가운데에 맞춰야 해요.");
  }
  if (s.thermo.where === "tube" && liq !== "ethanol") {
    return fail(s, "thermo_position_wrong", "온도계는 가지 달린 시험관 속 에탄올에 들어 있어요. 에탄올의 한가운데에 맞춰야 해요. (비커의 물은 데우는 용도예요)");
  }
  const state = { ...s, thermo: { ...s.thermo, adjusted: true } };
  return okOut(state, "adjust", `온도계 끝이 ${L(liq)}의 한가운데에 오도록 높이를 맞췄어요. 바닥에 닿으면 용기 바닥의 온도를, 액체 위에 있으면 공기의 온도를 재게 돼요.`, { liquid: liq });
}

function connectHose(s: BoilingState): Out {
  if (!s.tube.liquid) return fail(s, "hose_no_ethanol", "가지 달린 시험관이 아직 준비되지 않았어요. 먼저 에탄올을 넣어 주세요.");
  if (!s.tube.fixed) return fail(s, "hose_before_fix", "가지 달린 시험관을 먼저 스탠드에 고정한 뒤 고무관을 끼워요.");
  if (s.tube.hose) return fail(s, "already_connected", "고무관은 이미 연결되어 있어요.");
  return okOut({ ...s, tube: { ...s.tube, hose: true } }, "connect", "가지 달린 시험관의 가지에 고무관을 끼웠어요.", { what: "hose" });
}

function connectGlass(s: BoilingState): Out {
  if (!s.tube.hose) return fail(s, "glass_before_hose", "고무관을 먼저 가지 달린 시험관의 가지에 끼워야 해요.");
  if (s.tube.glass) return fail(s, "already_connected", "유리관은 이미 연결되어 있어요.");
  return okOut({ ...s, tube: { ...s.tube, glass: true } }, "connect", "고무관 반대쪽 끝에 유리관을 연결했어요.", { what: "glass" });
}

/** a6 — (  )에 (  )을(를) 연결한다 (순서 무관) */
export function connect(s: BoilingState, step: Step): Out {
  const pair = [eq(step, 0), eq(step, 1)];
  const has = (n: string): boolean => pair.includes(n);
  if (has("side_arm_tube") && has("rubber_tube")) return connectHose(s);
  if (has("rubber_tube") && has("glass_tube")) return connectGlass(s);
  if (has("side_arm_tube") && has("glass_tube")) {
    return fail(s, "glass_on_tube", "가지에는 고무관을 먼저 끼우고, 고무관 반대쪽 끝에 유리관을 연결해요.");
  }
  return fail(s, "connect_invalid", `${L(pair[0])}에 ${L(pair[1])}을(를) 연결할 수 없어요. 가지 달린 시험관–고무관, 고무관–유리관을 연결해요.`);
}

function emptyTubeIntoCold(s: BoilingState): Out {
  if (s.etube.inCold) return fail(s, "already_in_cold", "빈 시험관은 이미 찬물 비커 속에 있어요.");
  const state = { ...s, etube: { ...s.etube, inCold: true }, shown: { ...s.shown, cold: true, etube: true } };
  return okOut(state, "insertEtube", "빈 시험관을 찬물이 담긴 비커 속에 넣었어요.");
}

function glassIntoTrap(s: BoilingState): Out {
  if (!s.tube.glass) return fail(s, "glass_not_connected", "유리관이 아직 고무관에 연결되지 않았어요. 고무관 끝에 유리관을 먼저 연결해요.");
  if (!s.etube.inCold) return fail(s, "cold_trap_missing", "빈 시험관을 먼저 찬물 비커 속에 넣어 두세요.");
  if (s.tube.glassIn) return fail(s, "already_inserted", "유리관은 이미 빈 시험관 속에 들어 있어요.");
  const state = { ...s, tube: { ...s.tube, glassIn: true } };
  return okOut(state, "insertGlass", "유리관 끝을 찬물 속 빈 시험관에 넣었어요. 에탄올 증기가 여기서 식어 다시 액체로 모일 거예요.");
}

/** a7 — (  )을(를) (  ) 속에 넣는다 */
export function insertInto(s: BoilingState, step: Step): Out {
  const x = eq(step, 0);
  const y = eq(step, 1);
  if (x === "empty_tube" && y === "cold_water_beaker") return emptyTubeIntoCold(s);
  if (x === "glass_tube" && y === "empty_tube") return glassIntoTrap(s);
  if (x === "glass_tube" && y === "cold_water_beaker") {
    return fail(s, "glass_into_cold_beaker", "유리관 끝은 찬물 비커 속의 빈 시험관 안에 넣어야 에탄올 증기가 식어서 모여요.");
  }
  if (x === "side_arm_tube" && y === "beaker") {
    return fail(s, "tube_into_beaker", "가지 달린 시험관은 '(  )을(를) 스탠드에 고정한다' 블록으로 비커 속 물에 잠기게 고정해요.");
  }
  if (x === "thermometer") return fail(s, "insert_thermometer", "온도계는 스탠드에 고정하거나, 마개에 꽂아 시험관 입구를 막는 데 써요.");
  if (x === "empty_tube") return fail(s, "empty_tube_wrong_place", "빈 시험관은 찬물 비커 속에 넣어요. 두 번째 칸에 찬물 비커를 넣어 주세요.");
  return fail(s, "insert_invalid", `${L(x)}을(를) ${L(y)} 속에 넣을 수 없어요. 빈 시험관→찬물 비커, 유리관→빈 시험관을 넣어요.`);
}

export const SETUP_HANDLERS: Record<string, (s: BoilingState, step: Step, ctx: ReduceContext) => Out> = {
  a1: fill,
  a2: placeOnHotPlate,
  a3: fixToStand,
  a4: stopTube,
  a5: adjustThermometer,
  a6: connect,
  a7: insertInto,
};
