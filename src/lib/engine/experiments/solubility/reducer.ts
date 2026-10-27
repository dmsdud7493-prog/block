/**
 * 용해도 측정 리듀서 — 프로토타입 solubility-lab.html의 applyStep을 불변 상태로 이식.
 * 숫자는 ctx.param()/ctx.noise()로만 얻는다. dryRun(NaN)에서 물성에 기대는 판단(포화 여부)은 오류를 내지 않는다.
 */
import type { ReduceContext } from "../types";
import type { CalcRequest, Measurement, Step } from "../../types";
import { fmtNum, round2 } from "../../format";
import {
  BATHS, REPEAT_EACH_MAX, REPEAT_LIMIT, ROOM_T, SCOOP_MAX, TUBE_MAX,
  L, ev, eq, fail, isSolute, isTube, num, tubeInfo, tubeWith, updateTube, weigh,
  type Out, type SolubilityState, type Tube, type TubeId,
} from "./model";

export type { SolubilityState } from "./model";
export { initialSolubilityState } from "./model";

const mk = (key: string, label: string, value: number, unit: Measurement["unit"], subject: string, trial: number): Measurement =>
  ({ key, trial, label, value, unit, subject });

function pourWater(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const tube = eq(step, 0);
  const liq = eq(step, 1);
  const amt = num(step, 2);
  if (!isTube(tube)) return fail(s, "water_not_tube", `${L(tube)}에는 물을 넣지 않아요. 첫 번째 칸에는 시험관(A, B, C)을 넣어 주세요.`);
  if (liq !== "water") {
    return isSolute(liq)
      ? fail(s, "water_is_solute", `${L(liq)}은(는) 물에 녹일 용질이에요. 두 번째 칸에는 용매인 물을 넣어 주세요.`)
      : fail(s, "water_not_solvent", `${L(liq)}은(는) 시험관에 넣는 용매가 아니에요. 두 번째 칸에는 물을 넣어 주세요.`);
  }
  const t = s.tubes[tube];
  if (t.water > 0) return fail(s, "tube_has_water", `${L(tube)}에는 이미 물이 ${fmtNum(t.water)} g 들어 있어요. 새 실험은 다른 시험관에서 해 보세요.`);
  if (amt > TUBE_MAX) return fail(s, "over_capacity", `시험관에는 물을 ${TUBE_MAX} g까지만 넣을 수 있어요. 양을 줄여 볼까요?`);
  const water = round2(amt);
  const state = { ...updateTube(s, tube, { water }), lastTube: tube, shown: { ...s.shown, [tube]: true } };
  return { state, event: ev("pour", `${L(tube)}에 실온(${ROOM_T} °C)의 물을 ${fmtNum(water)} g 넣었어요.`, state, ctx, { tube, amount: water }) };
}

function tare(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const sc = eq(step, 0);
  const item = eq(step, 1);
  if (sc !== "scale") return fail(s, "tare_not_scale", `첫 번째 칸에는 전자저울을 넣어야 해요. (지금은 ${L(sc)})`);
  if (item !== "weighing_paper") {
    return isSolute(item)
      ? fail(s, "tare_solute_direct", `${L(item)}은(는) 저울에 바로 올리지 않아요. 두 번째 칸에는 시약포지를 넣어 주세요.`)
      : fail(s, "tare_not_paper", "두 번째 칸에는 시약포지를 넣어 주세요. 시약포지 위에 용질을 올려서 질량을 재요.");
  }
  if (s.paper.sub) return fail(s, "paper_not_empty", `시약포지 위에 아직 ${L(s.paper.sub)}이(가) 남아 있어요. 먼저 시험관에 넣어 주세요.`);
  const state = { ...s, paperOnScale: true, shown: { ...s.shown, scale: true } };
  const note = "전자저울 위에 시약포지를 올리고 영점을 맞췄어요. 시약포지 무게를 빼고 저울이 0.00 g을 가리켜요.";
  return { state, event: ev("zero", note, state, ctx, { paperMass: ctx.param("paper.mass") }) };
}

function scoop(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const sub = eq(step, 0);
  const amt = num(step, 1);
  const tool = eq(step, 2);
  if (!isSolute(sub)) {
    return sub === "water"
      ? fail(s, "scoop_water", "물은 용매라서 약숟가락으로 뜨지 않아요. 첫 번째 칸에는 질산 칼륨이나 황산 구리(II)를 넣어 주세요.")
      : fail(s, "scoop_not_solute", `${L(sub)}은(는) 떠서 녹일 물질이 아니에요. 질산 칼륨이나 황산 구리(II)를 넣어 주세요.`);
  }
  if (tool !== "spatula") return fail(s, "scoop_not_spatula", `가루 시약은 약숟가락으로 떠요. 세 번째 칸에는 약숟가락을 넣어 주세요. (지금은 ${L(tool)})`);
  if (!s.paperOnScale) return fail(s, "weigh_no_tare", "전자저울에 시약포지가 없어요. 먼저 '전자저울 위에 시약포지를 올리고 영점 조정을 한다'를 해 볼까요?");
  if (s.paper.sub) return fail(s, "paper_not_empty", `시약포지 위에 이미 ${L(s.paper.sub)}이(가) 있어요. 먼저 시험관에 넣어 주세요.`);
  if (amt > SCOOP_MAX) return fail(s, "scoop_too_much", `한 번에 많이 떴어요. ${SCOOP_MAX} g 이하로 떠 볼까요?`);
  const reading = weigh(amt, ctx);
  const state = { ...s, paper: { sub, amt: reading } };
  return { state, event: ev("scoop", `${L(sub)}을(를) 약숟가락으로 떠서 시약포지에 올렸어요. 저울: ${reading.toFixed(2)} g`, state, ctx, { sub, amount: reading }) };
}

function addProblem(s: SolubilityState, sub: string | null, tube: string | null): Out | null {
  if (!isTube(tube)) return fail(s, "add_not_tube", `두 번째 칸에는 시험관(A, B, C)을 넣어 주세요. (지금은 ${L(tube)})`);
  if (!s.paper.sub) return fail(s, "add_paper_empty", `시약포지 위에 아무것도 없어요. 먼저 약숟가락으로 ${isSolute(sub) ? L(sub) : "용질"}을(를) 떠서 올려 볼까요?`);
  if (s.paper.sub !== sub) return fail(s, "add_wrong_solute", `시약포지 위에는 ${L(s.paper.sub)}이(가) 있어요. 첫 번째 칸을 ${L(s.paper.sub)}(으)로 바꿔 주세요.`);
  const t = s.tubes[tube];
  if (t.water <= 0) return fail(s, "add_no_water", `${L(tube)}에 아직 물이 없어요. 먼저 물을 넣어야 녹일 수 있어요.`);
  if (t.solute && t.solute !== sub) {
    return fail(s, "two_solutes_one_tube", `${L(tube)}에는 이미 ${L(t.solute)}이(가) 들어 있어요. 다른 물질은 다른 시험관에 넣어야 따로 비교할 수 있어요.`);
  }
  return null;
}

function addToTube(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const sub = eq(step, 0);
  const tube = eq(step, 1);
  const problem = addProblem(s, sub, tube);
  if (problem || !isTube(tube) || !sub) return problem ?? fail(s, "add_not_tube", "두 번째 칸에는 시험관(A, B, C)을 넣어 주세요.");
  const before = tubeInfo(s.tubes[tube], ctx);
  const amount = s.paper.amt;
  const t: Tube = { ...s.tubes[tube], solute: sub, added: round2(s.tubes[tube].added + amount) };
  const after = tubeInfo(t, ctx);
  const tube2 = after.solid === 0 && t.temp > ROOM_T ? { ...t, clearedHot: true } : t;
  const state = { ...updateTube(s, tube, tube2), paper: { sub: null, amt: 0 }, lastTube: tube };
  const look = after.solid > 0 ? "녹지 않은 가루가 바닥에 남았어요." : "흔들었더니 모두 녹았어요.";
  const note = `시약포지의 ${L(sub)}을(를) ${L(tube)}에 넣고 잘 흔들었어요. ${look}`;
  return { state, event: ev("add", note, state, ctx, { sub, tube, amount, total: t.added, dissolved: after.dissolved, solid: after.solid, wasSolid: before.solid }) };
}

interface Iter { total: number; dissolved: number; solid: number }

/** 반복 블록 펼치기: 바닥에 가라앉을 때까지(포화) 같은 양을 넣고 흔든다. NaN이면 0회 */
function repeatAdd(t: Tube, each: number, ctx: ReduceContext, acc: Iter[]): { tube: Tube; iters: Iter[] } {
  const info = tubeInfo(t, ctx);
  if (!(info.solid <= 0) || acc.length >= REPEAT_LIMIT) return { tube: t, iters: acc };
  const next: Tube = { ...t, added: round2(t.added + weigh(each, ctx)) };
  const ni = tubeInfo(next, ctx);
  return repeatAdd(next, each, ctx, [...acc, { total: next.added, dissolved: ni.dissolved, solid: ni.solid }]);
}

function repeatUntilSaturated(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const sub = eq(step, 0);
  const each = num(step, 1);
  if (!isSolute(sub)) return fail(s, "repeat_not_solute", "첫 번째 칸에는 녹이고 있는 용질(질산 칼륨이나 황산 구리(II))을 넣어 주세요.");
  const tube = tubeWith(s, sub);
  if (!tube) return fail(s, "repeat_no_tube", `아직 ${L(sub)}을(를) 시험관에 넣지 않았어요. 먼저 한 번 떠서 넣고 흔든 다음에 반복해요.`);
  if (!s.paperOnScale) return fail(s, "weigh_no_tare", "전자저울에 시약포지가 없어요. 시약포지를 올리고 영점 조정을 먼저 해 볼까요?");
  if (s.paper.sub) return fail(s, "paper_not_empty", `시약포지 위에 아직 ${L(s.paper.sub)}이(가) 남아 있어요. 먼저 시험관에 넣어 주세요.`);
  if (each > REPEAT_EACH_MAX) return fail(s, "repeat_step_too_big", `조금씩 넣어야 몇 g째에 가라앉는지 알 수 있어요. ${REPEAT_EACH_MAX} g 이하로 넣어 볼까요?`);
  const { tube: t, iters } = repeatAdd(s.tubes[tube], each, ctx, []);
  const info = tubeInfo(t, ctx);
  const state = { ...updateTube(s, tube, t), lastTube: tube };
  const note = `${L(sub)}을(를) ${fmtNum(each)} g씩 ${iters.length}번 더 넣고 흔들었어요. 이제 더 녹지 않고 바닥에 가라앉아요.`;
  return { state, event: ev("repeat", note, state, ctx, { sub, tube, each, iters, total: t.added, dissolved: info.dissolved, solid: info.solid }) };
}

function recordTotal(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const sub = eq(step, 0);
  if (!isSolute(sub)) return fail(s, "record_not_solute", "총량을 기록할 용질(질산 칼륨이나 황산 구리(II))을 넣어 주세요.");
  const tube = tubeWith(s, sub);
  if (!tube) return fail(s, "record_no_tube", `아직 ${L(sub)}을(를) 시험관에 넣지 않았어요.`);
  const t = s.tubes[tube];
  const info = tubeInfo(t, ctx);
  if (info.solid <= 0) {
    return fail(s, "record_not_saturated", `${L(sub)}이(가) 아직 모두 녹고 있어요. 더 이상 녹지 않고 바닥에 가라앉을 때까지 넣어야 최대로 녹는 양을 알 수 있어요.`);
  }
  const tr = ctx.trial;
  const k = (name: string) => `${name}.${sub}.t${tr}`;
  const measurements = [
    mk(k("water"), "물의 질량", t.water, "g", sub, tr),
    mk(k("temp"), "온도", t.temp, "°C", sub, tr),
    mk(k("added"), "넣은 총량", t.added, "g", sub, tr),
    mk(k("dissolved"), "녹은 양", info.dissolved, "g", sub, tr),
  ];
  const request: CalcRequest = { key: `sol.${sub}.t${tr}`, trial: tr, label: "물 100 g에 녹는 양", unit: "g/물 100 g", subject: sub, inputs: [k("dissolved"), k("water")] };
  const note = `${L(tube)}: 물 ${fmtNum(t.water)} g에 넣은 ${L(sub)}의 총량을 표에 기록했어요. 물 100 g에 녹는 양은 직접 계산해 볼까요?`;
  const event = ev("record", note, s, ctx, { sub, tube, water: t.water, temp: t.temp, total: t.added, dissolved: info.dissolved, solid: info.solid });
  return { state: s, measurements, calcRequests: [request], endTrial: true, event };
}

/** 온도별 관찰값: 녹은 양·바닥에 남은 양 (시험관·온도마다) */
function observeMeasurements(tube: TubeId, t: Tube, temp: number, d: number, solid: number, trial: number): Measurement[] {
  const sub = t.solute ?? "none";
  const k = (name: string) => `${name}.${sub}.${tube}.${temp}c.t${trial}`;
  return [
    mk(k("dissolved"), `녹은 양 (${temp} °C)`, d, "g", sub, trial),
    mk(k("solid"), `녹지 않고 남은 양 (${temp} °C)`, solid, "g", sub, trial),
  ];
}

function bathProblem(s: SolubilityState, tube: string | null, bath: string | null): Out | null {
  if (!isTube(tube)) return fail(s, "bath_not_tube", `첫 번째 칸에는 시험관(A, B, C)을 넣어 주세요. (지금은 ${L(tube)})`);
  if (!bath || !(bath in BATHS)) {
    return bath === "water"
      ? fail(s, "bath_plain_water", "온도가 다른 물이 필요해요. 두 번째 칸에는 뜨거운 물이나 얼음물을 넣어 주세요.")
      : fail(s, "bath_not_bath", `두 번째 칸에는 뜨거운 물이나 얼음물을 넣어 주세요. (지금은 ${L(bath)})`);
  }
  if (s.tubes[tube].water <= 0) return fail(s, "bath_empty_tube", `${L(tube)}에 아직 아무것도 없어요. 먼저 물과 용질을 넣어 주세요.`);
  return null;
}

function bathNote(tube: TubeId, bath: string, solid: number, crystal: boolean): string {
  const look = crystal ? "녹아 있던 물질이 다시 나와 반짝이는 결정이 생겼어요."
    : solid > 0 ? "바닥에 녹지 않은 고체가 남아 있어요." : "바닥에 남은 고체가 보이지 않아요.";
  return `${L(tube)}을(를) ${L(bath)}이(가) 담긴 비커에 넣고 지켜봤어요. ${look}`;
}

function bath(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const tube = eq(step, 0);
  const b = eq(step, 1);
  const problem = bathProblem(s, tube, b);
  if (problem || !isTube(tube) || !b) return problem ?? fail(s, "bath_not_tube", "첫 번째 칸에는 시험관(A, B, C)을 넣어 주세요.");
  const t0 = s.tubes[tube];
  const before = tubeInfo(t0, ctx);
  const warmed: Tube = { ...t0, temp: BATHS[b], bath: b };
  const after = tubeInfo(warmed, ctx);
  const cleared = warmed.clearedHot || (after.solid === 0 && warmed.temp > ROOM_T && warmed.solute !== null);
  const crystal = after.solid > 0 && cleared && warmed.temp < ROOM_T;
  const t: Tube = { ...warmed, clearedHot: cleared, crystal };
  const state = { ...updateTube(s, tube, t), lastTube: tube };
  const fromRoom = t0.temp === ROOM_T && t0.solute !== null;
  const measurements = [
    ...(fromRoom ? observeMeasurements(tube, t0, t0.temp, before.dissolved, before.solid, ctx.trial) : []),
    ...(t.solute ? observeMeasurements(tube, t, t.temp, after.dissolved, after.solid, ctx.trial) : []),
  ];
  const extra = { tube, bath: b, sub: t.solute, water: t.water, total: t.added, fromT: t0.temp, toT: t.temp, before: { d: before.dissolved, s: before.solid }, dissolved: after.dissolved, solid: after.solid, crystal };
  return { state, measurements, endTrial: true, event: ev("bath", bathNote(tube, b, after.solid, crystal), state, ctx, extra) };
}

function observe(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const tube = eq(step, 0);
  if (!isTube(tube)) {
    return isSolute(tube)
      ? fail(s, "observe_not_tube", `${L(tube)}이(가) 들어 있는 시험관(A, B, C)을 넣어 주세요.`)
      : fail(s, "observe_not_tube", "관찰할 시험관(A, B, C)을 넣어 주세요.");
  }
  const t = s.tubes[tube];
  if (t.water <= 0) return fail(s, "observe_empty_tube", `${L(tube)}에 아직 아무것도 없어요.`);
  const info = tubeInfo(t, ctx);
  const measurements = t.solute ? observeMeasurements(tube, t, t.temp, info.dissolved, info.solid, ctx.trial) : [];
  const look = t.crystal ? "결정이 보여요." : info.solid > 0 ? "바닥에 녹지 않은 고체가 있어요." : "바닥에 남은 고체가 보이지 않아요.";
  const note = `${L(tube)}을(를) 관찰했어요 (지금 ${t.temp} °C). ${look}`;
  const extra = { tube, sub: t.solute, water: t.water, total: t.added, temp: t.temp, dissolved: info.dissolved, solid: info.solid, crystal: t.crystal };
  return { state: s, measurements, event: ev("observe", note, s, ctx, extra) };
}

const HANDLERS: Record<string, (s: SolubilityState, step: Step, ctx: ReduceContext) => Out> = {
  a1: pourWater,
  a2: tare,
  a3: scoop,
  a4: addToTube,
  a5: repeatUntilSaturated,
  a6: recordTotal,
  a7: bath,
  a8: observe,
};

export function reduceSolubility(s: SolubilityState, step: Step, ctx: ReduceContext): Out {
  const h = HANDLERS[step.action];
  return h ? h(s, step, ctx) : fail(s, "unknown_block", "이 실험에서 쓸 수 없는 블록이에요.");
}

