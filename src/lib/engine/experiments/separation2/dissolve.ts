/**
 * 재결정 리듀서 (1) — 넣기·녹이기·식히기·온도 측정·결정 관찰 (프로토타입 applyStep a1~a5 이식).
 * 숫자는 ctx.param()으로만 얻고, NaN 비교는 언제나 "문제 없음" 쪽으로 흐른다(dryRun 안전).
 */
import type { ReduceContext } from "../types";
import type { Step } from "../../types";
import { fixJosa, fmtNum, round1, round2 } from "../../format";
import {
  AFTER_FILTER, BATH_FILL, BATH_MAX, BKR_MAX, L, SOLUTES, capOf, eq, fail, freshIfChecked, isSolute, isWater,
  num, precipitate, sceneOf, totalOf, unitOf,
  type Out, type Separation2State, type Solute,
} from "./model";

const ok = (state: Separation2State, type: string, note: string, extra: Record<string, unknown> = {}): Out => ({
  state,
  event: { type, note: fixJosa(note), ...extra, scene: sceneOf(state) },
});

function fillBath(s: Separation2State, sub: string, amt: number): Out {
  if (sub !== "ice_water") {
    return fail(s, "wrong_container", "큰 비커에는 비커를 식힐 때 쓸 얼음물을 담아요. 혼합물은 비커에 넣어 녹여요.");
  }
  if (s.bath + amt > BATH_MAX) return fail(s, "bath_over_capacity", `큰 비커에는 얼음물을 ${BATH_MAX} g까지만 담을 수 있어요.`);
  const state = { ...s, bath: round1(s.bath + amt), shown: { ...s.shown, bath: true } };
  return ok(state, "bath", `큰 비커에 얼음물을 ${fmtNum(amt)} g 담았어요.`, { amount: amt });
}

function addSolid(s: Separation2State, sub: Solute, amt: number, unit: string): Out {
  if (unit === "mL") return fail(s, "solid_in_ml", `${L(sub)}은(는) 가루라서 mL가 아니라 g(그램)으로 재서 넣어요.`);
  const b = s.bkr;
  const state: Separation2State = {
    ...s,
    bkr: { ...b, undis: { ...b.undis, [sub]: round2(b.undis[sub] + amt) } },
    added: { ...s.added, [sub]: round2(s.added[sub] + amt) },
    shown: { ...s.shown, bkr: true },
  };
  return ok(state, "addSolid", `비커에 ${L(sub)}을(를) ${fmtNum(amt)} g 넣었어요.`, { name: sub, amount: amt });
}

function addWater(s: Separation2State, sub: string, amt: number, ctx: ReduceContext): Out {
  const b = s.bkr;
  if (b.water + amt > BKR_MAX) {
    return fail(s, "over_capacity", `비커에는 물을 ${BKR_MAX} g까지만 담을 수 있어요. (지금 ${fmtNum(b.water)} g + ${fmtNum(amt)} g)`);
  }
  const Tw = ctx.param(`${sub}.temp`);
  const T = b.water > 0 ? Math.round((b.water * b.T + amt * Tw) / (b.water + amt)) : Tw;
  const bkr = precipitate({ ...b, T, water: round1(b.water + amt) }, ctx);
  const state = { ...s, bkr, shown: { ...s.shown, bkr: true } };
  return ok(state, "addWater", `비커에 ${L(sub)}을(를) ${fmtNum(amt)} g 넣었어요. 물의 온도는 약 ${fmtNum(T)} °C예요.`, { name: sub, amount: amt, T });
}

export function addInto(s0: Separation2State, step: Step, ctx: ReduceContext): Out {
  const s = freshIfChecked(s0);
  const cont = eq(step, 0);
  const sub = eq(step, 1);
  const amt = round1(num(step, 2));
  if (cont !== "beaker" && cont !== "large_beaker") {
    return fail(s, "add_not_container", `${L(cont)}에는 넣을 수 없어요. 첫 번째 칸에는 비커를 넣어 주세요.`);
  }
  if (!isSolute(sub) && !isWater(sub)) {
    return fail(s, "add_not_substance", `${L(sub)}은(는) 넣는 물질이 아니에요. 두 번째 칸에는 붕산, 황산 구리(II), 뜨거운 물, 얼음물 중 하나를 넣어 주세요.`);
  }
  if (cont === "large_beaker") return fillBath(s, sub as string, amt);
  if (s.filter.done) return fail(s, "after_filter", AFTER_FILTER);
  if (isSolute(sub)) return addSolid(s, sub, amt, unitOf(step, 2));
  return addWater(s, sub as string, amt, ctx);
}

function solubilityProblem(s: Separation2State, ctx: ReduceContext): Out | null {
  const b = s.bkr;
  const over = SOLUTES.find((n) => totalOf(b, n) > capOf(ctx, n, b.T, b.water) + 1e-9);
  if (!over) return null;
  if (b.T < 40) {
    return fail(s, "too_cold_to_dissolve", `물이 차가워서(약 ${fmtNum(b.T)}°C) ${L(over)}이(가) 다 녹지 않아요. 고체는 온도가 높을수록 많이 녹으니 뜨거운 물을 써 보세요.`);
  }
  const cap = capOf(ctx, over, b.T, b.water);
  return fail(s, "over_solubility", `${fmtNum(b.T)}°C 물 ${fmtNum(b.water)} g에는 ${L(over)}이(가) 약 ${fmtNum(cap)} g까지만 녹아요. 넣은 양(${fmtNum(totalOf(b, over))} g)을 줄이거나 물을 늘려 보세요.`);
}

export function stir(s: Separation2State, step: Step, ctx: ReduceContext): Out {
  const b = s.bkr;
  const tool = eq(step, 0);
  if (tool !== "glass_rod") return fail(s, "stir_not_rod", `${L(tool)}(으)로는 저을 수 없어요. 빈 칸에 유리 막대를 넣어 주세요.`);
  if (s.filter.done) return fail(s, "after_filter", AFTER_FILTER);
  if (b.water <= 0) return fail(s, "stir_no_water", "비커에 아직 물이 없어요. 먼저 비커에 뜨거운 물을 넣어야 녹일 수 있어요.");
  if (totalOf(b, "boric_acid") + totalOf(b, "cuso4") <= 0) {
    return fail(s, "stir_nothing", "비커에 녹일 물질이 없어요. 먼저 붕산과 황산 구리(II)를 넣어 주세요.");
  }
  const problem = solubilityProblem(s, ctx);
  if (problem) return problem;
  const dis = { boric_acid: round2(totalOf(b, "boric_acid")), cuso4: round2(totalOf(b, "cuso4")) };
  const bkr = { ...b, dis, undis: { boric_acid: 0, cuso4: 0 }, xtal: { boric_acid: 0, cuso4: 0 }, stirred: true };
  const state = { ...s, bkr, hotT: b.T };
  return ok(state, "stir", `유리 막대로 저었더니 붕산과 황산 구리(II)가 모두 녹았어요. 용액이 파랗게 보여요.`, { T: b.T, water: b.water, dis: { ...dis } });
}

function coolProblem(s: Separation2State, step: Step): Out | null {
  const item = eq(step, 0);
  const coolant = eq(step, 1);
  const vessel = eq(step, 2);
  if (item !== "beaker") return fail(s, "cool_not_beaker", `${L(item)}은(는) 식힐 수 없어요. 첫 번째 칸에는 용액이 든 비커를 넣어 주세요.`);
  if (coolant === "hot_water") return fail(s, "cool_hot_water", "뜨거운 물로는 식힐 수 없어요. 두 번째 칸에는 얼음물을 넣어 주세요.");
  if (coolant !== "ice_water") return fail(s, "cool_not_ice", `두 번째 칸에는 차가운 얼음물을 넣어 주세요. (지금은 ${L(coolant)})`);
  if (vessel === "beaker") return fail(s, "cool_wrong_container", "비커를 통째로 담글 더 큰 그릇이 필요해요. 세 번째 칸에는 큰 비커를 넣어 주세요.");
  if (vessel !== "large_beaker") return fail(s, "cool_not_large_beaker", `세 번째 칸에는 큰 비커를 넣어 주세요. (지금은 ${L(vessel)})`);
  if (s.filter.done) return fail(s, "after_filter", AFTER_FILTER);
  const b = s.bkr;
  if (b.water <= 0) return fail(s, "cool_no_solution", "비커에 식힐 용액이 없어요. 먼저 비커에 물과 혼합물을 넣고 녹여 주세요.");
  if (totalOf(b, "boric_acid") + totalOf(b, "cuso4") <= 0) {
    return fail(s, "cool_nothing_dissolved", "비커에 녹아 있는 물질이 없어요. 먼저 붕산과 황산 구리(II)를 넣고 녹여 주세요.");
  }
  if (b.undis.boric_acid > 0 || b.undis.cuso4 > 0) {
    return b.stirred
      ? fail(s, "cool_before_dissolve", "새로 넣은 가루가 아직 녹지 않았어요. 식히기 전에 유리 막대로 저어 모두 녹여 주세요.")
      : fail(s, "cool_before_dissolve", "아직 녹이지 않았어요. 먼저 유리 막대로 저어 혼합물을 모두 녹여야 해요.");
  }
  if (s.inBath) return fail(s, "already_in_bath", "비커가 이미 얼음물 속에 들어 있어요.");
  return null;
}

export function cool(s: Separation2State, step: Step, ctx: ReduceContext): Out {
  const problem = coolProblem(s, step);
  if (problem) return problem;
  const b = s.bkr;
  const autoFill = s.bath <= 0;
  const fromT = b.T;
  const toT = Math.min(b.T, ctx.param("cool.temp"));
  const capHot = { boric_acid: capOf(ctx, "boric_acid", fromT, b.water), cuso4: capOf(ctx, "cuso4", fromT, b.water) };
  const capCold = { boric_acid: capOf(ctx, "boric_acid", toT, b.water), cuso4: capOf(ctx, "cuso4", toT, b.water) };
  const bkr = precipitate({ ...b, T: toT }, ctx);
  const state: Separation2State = {
    ...s, bkr, bath: autoFill ? BATH_FILL : s.bath, inBath: true, cooled: true, shown: { ...s.shown, bath: true },
  };
  const note = bkr.xtal.boric_acid > 0 || bkr.xtal.cuso4 > 0
    ? `비커를 얼음물에 넣어 약 ${fmtNum(toT)} °C까지 식혔어요. 용액 속에 결정이 생기기 시작해요.`
    : `비커를 얼음물에 넣어 약 ${fmtNum(toT)} °C까지 식혔어요. 용액을 잘 살펴보세요.`;
  return ok(state, "cool", note, { fromT, toT, autoFill, water: b.water, dis0: { ...b.dis }, capHot, capCold, xtal: { ...bkr.xtal } });
}

export function measureTemp(s: Separation2State, step: Step): Out {
  const tool = eq(step, 0);
  if (tool === "scale") return fail(s, "temp_scale_tool", "전자저울은 질량을 재는 도구예요. 온도는 온도계로 재요.");
  if (tool !== "thermometer") return fail(s, "temp_not_thermometer", `${L(tool)}(으)로는 온도를 잴 수 없어요. 빈 칸에 온도계를 넣어 주세요.`);
  if (s.filter.done) return fail(s, "temp_after_filter", "용액은 이미 걸러졌어요. 온도는 거르기 전에 비커에서 재요.");
  if (s.bkr.water <= 0) return fail(s, "temp_no_water", "비커에 아직 물이 없어요. 먼저 비커에 물을 넣어야 온도를 잴 수 있어요.");
  const state = { ...s, thermo: true };
  return ok(state, "temp", `온도계가 약 ${fmtNum(s.bkr.T)} °C를 가리켜요.`, { T: s.bkr.T });
}

export function observe(s: Separation2State): Out {
  const b = s.bkr;
  if (s.filter.done) return fail(s, "observe_after_filter", "결정은 이미 거름종이로 옮겨졌어요. 결정 관찰은 거르기 전에 해요.");
  if (b.water <= 0) return fail(s, "observe_no_solution", "비커에 용액이 없어요. 먼저 혼합물을 물에 넣고 녹여 주세요.");
  if (!s.cooled) {
    return b.undis.boric_acid > 0 || b.undis.cuso4 > 0
      ? fail(s, "observe_undissolved", "지금 보이는 건 아직 녹지 않은 가루예요. 결정은 모두 녹인 용액을 식힐 때 생겨요.")
      : fail(s, "observe_not_cooled", "아직 결정이 생기지 않았어요. 용액을 얼음물로 식혀야 결정이 생겨요.");
  }
  const parts = [
    b.xtal.boric_acid > 0 ? "흰색 결정" : null,
    b.xtal.cuso4 > 0 ? "파란색 결정" : null,
  ].filter((x): x is string => x !== null);
  const seen = parts.length > 0 ? `${parts.join("과 ")}이 보여요.` : "결정이 보이지 않아요.";
  const color = b.dis.cuso4 > 0 ? " 용액은 여전히 파란색이에요." : "";
  return ok(s, "observe", `비커 속을 자세히 관찰했어요. ${seen}${color}`, { xtal: { ...b.xtal }, dis: { ...b.dis }, T: b.T });
}
