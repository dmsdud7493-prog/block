/**
 * 밀도 측정 리듀서 — 프로토타입 density_lab.html의 applyStep을 불변 상태로 이식.
 * 숫자는 ctx.param()/ctx.noise()로만 얻는다(dryRun에서는 NaN). 오류 문구는 프로토타입을 유지한다.
 */
import type { ReduceContext } from "../types";
import type { Measurement, Step, StepOutcome } from "../../types";
import { fixJosa, fmtNum, round1 } from "../../format";

export const CYL_MAX = 100;
export const BKR_MAX = 250;

type ContainerId = "cylinder" | "beaker";
interface Measured { name: string; value: number; key: string }

export interface DensityState {
  cyl: { liquid: string | null; volume: number; solids: string[] };
  bkr: { liquid: string | null; volume: number };
  scale: { item: ContainerId | null; tare: number };
  scaleSolid: string | null;
  lastInsert: { name: string; before: number; after: number } | null;
  measured: { mass: Measured | null; volume: Measured | null };
  shown: { scale: boolean; cyl: boolean; bkr: boolean };
}

type Out = StepOutcome<DensityState> & { endTrial?: boolean };

const LABEL: Record<string, string> = {
  water: "물", oil: "식용유", iron_big: "큰 철조각", iron_small: "작은 철조각",
  cylinder: "눈금실린더", beaker: "비커", tweezers: "핀셋", scale: "전자저울", thread: "실",
};
const L = (id: string | null): string => (id ? LABEL[id] ?? id : "빈 칸");
const isLiquid = (id: string | null): boolean => id === "water" || id === "oil";
const isSolid = (id: string | null): boolean => id === "iron_big" || id === "iron_small";
const isContainer = (id: string | null): id is ContainerId => id === "cylinder" || id === "beaker";

export function initialDensityState(): DensityState {
  return {
    cyl: { liquid: null, volume: 0, solids: [] },
    bkr: { liquid: null, volume: 0 },
    scale: { item: null, tare: 0 },
    scaleSolid: null,
    lastInsert: null,
    measured: { mass: null, volume: null },
    shown: { scale: false, cyl: false, bkr: false },
  };
}

const fail = (s: DensityState, code: string, message: string): Out => ({ state: s, error: { code, message: fixJosa(message) } });

const eq = (step: Step, i: number): string | null => {
  const v = step.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};
const num = (step: Step, i: number): number => {
  const v = step.slots[i];
  return v && v.kind === "quant" ? v.value : Number.NaN;
};

function cylLevel(s: DensityState, ctx: ReduceContext): number {
  return round1(s.cyl.volume + s.cyl.solids.reduce((a, n) => a + ctx.param(`${n}.volume`), 0));
}

function totalMass(s: DensityState, item: ContainerId, ctx: ReduceContext): number {
  if (item === "beaker") {
    return ctx.param("beaker.mass") + (s.bkr.liquid ? s.bkr.volume * ctx.param(`${s.bkr.liquid}.density`) : 0);
  }
  const liquid = s.cyl.liquid ? s.cyl.volume * ctx.param(`${s.cyl.liquid}.density`) : 0;
  return ctx.param("cylinder.mass") + liquid + s.cyl.solids.reduce((a, n) => a + ctx.param(`${n}.mass`), 0);
}

function readScale(s: DensityState, ctx: ReduceContext): number {
  const net = s.scale.item ? totalMass(s, s.scale.item, ctx) - s.scale.tare : 0;
  const solid = s.scaleSolid ? ctx.param(`${s.scaleSolid}.mass`) : 0;
  return round1(ctx.noise(net + solid, { resolution: 0.1 }));
}

function addLiquid(s: DensityState, container: ContainerId, liq: string, amt: number, ctx: ReduceContext): Out | DensityState {
  const c = container === "cylinder" ? s.cyl : s.bkr;
  if (c.liquid && c.liquid !== liq && c.volume > 0) {
    return fail(s, "liquid_mix", `${L(container)}에 이미 ${L(c.liquid)}이(가) 들어 있어요. 다른 액체와 섞을 수 없어요.`);
  }
  if (container === "cylinder" && cylLevel(s, ctx) + amt > CYL_MAX) {
    return fail(s, "over_capacity", `눈금실린더는 ${CYL_MAX}mL까지만 담을 수 있어요. (현재 ${fmtNum(cylLevel(s, ctx))}mL + ${fmtNum(amt)}mL)`);
  }
  if (container === "beaker" && c.volume + amt > BKR_MAX) {
    return fail(s, "over_capacity", `비커는 ${BKR_MAX}mL까지만 담을 수 있어요.`);
  }
  return container === "cylinder"
    ? { ...s, cyl: { ...s.cyl, liquid: liq, volume: round1(s.cyl.volume + amt) }, shown: { ...s.shown, cyl: true } }
    : { ...s, bkr: { ...s.bkr, liquid: liq, volume: round1(s.bkr.volume + amt) }, shown: { ...s.shown, bkr: true } };
}

const isOut = (x: Out | DensityState): x is Out => "state" in x;

function pourOut(r: Out | DensityState, container: ContainerId, liq: string, amt: number): Out {
  if (isOut(r)) return r;
  return { state: r, event: { type: "pour", container, liquid: liq, amount: amt, note: fixJosa(`${L(container)}에 ${L(liq)}을(를) ${fmtNum(amt)} mL 부었어요.`) } };
}

function zeroScale(s: DensityState, step: Step, ctx: ReduceContext): Out {
  const item = eq(step, 0);
  const scale = eq(step, 1);
  if (!isContainer(item)) {
    return fail(s, "tare_not_container", `${L(item)}은(는) 저울에 올려 영점조정할 수 없어요. 첫 번째 칸에는 눈금실린더를 넣어 주세요.`);
  }
  if (scale !== "scale") return fail(s, "tare_not_scale", `두 번째 칸에는 전자저울을 넣어야 해요. (지금은 ${L(scale)})`);
  const tare = round1(totalMass(s, item, ctx));
  const shown = { ...s.shown, scale: true, ...(item === "cylinder" ? { cyl: true } : { bkr: true }) };
  const state = { ...s, scale: { item, tare }, scaleSolid: null, shown };
  return { state, event: { type: "zero", item, note: fixJosa(`${L(item)}을(를) 전자저울에 올리고 영점을 맞췄어요. 저울이 0.0 g을 가리켜요.`) } };
}

function pourIntoCylinder(s: DensityState, step: Step, ctx: ReduceContext): Out {
  const liq = eq(step, 0);
  const amt = num(step, 1);
  if (!isLiquid(liq)) {
    return isSolid(liq)
      ? fail(s, "pour_solid", `${L(liq)}은(는) 고체라서 부을 수 없어요. 물이나 식용유를 넣어 주세요.`)
      : fail(s, "pour_not_liquid", `${L(liq)}은(는) 붓는 물질이 아니에요. 물이나 식용유를 넣어 주세요.`);
  }
  return pourOut(addLiquid(s, "cylinder", liq as string, amt, ctx), "cylinder", liq as string, amt);
}

function measured(key: string, name: string, value: number): Measured {
  return { key, name, value };
}

function mkMeasurement(m: Measured, label: string, unit: Measurement["unit"], trial: number): Measurement {
  return { key: m.key, trial, label, value: m.value, unit, subject: m.name };
}

function measureVolume(s: DensityState, step: Step, ctx: ReduceContext): Out {
  const t = eq(step, 0);
  if (isSolid(t)) {
    return fail(s, "solid_volume_direct", `${L(t)}은(는) 고체예요. 고체의 부피는 물에 넣었을 때 늘어난 부피로 재요. '부피변화를 측정한다' 블록을 써 보세요.`);
  }
  if (!isLiquid(t)) return fail(s, "volume_not_substance", `${L(t)}의 부피는 이 블록으로 잴 수 없어요. 물질(물, 식용유)을 넣어 주세요.`);
  if (s.cyl.liquid !== t || s.cyl.volume <= 0) {
    return s.bkr.liquid === t
      ? fail(s, "volume_in_beaker", `${L(t)}이(가) 비커에 있어요. 비커 눈금은 정확하지 않아서, 부피는 눈금실린더에서 재야 해요.`)
      : fail(s, "volume_nothing", `눈금실린더에 ${L(t)}이(가) 없어요. 먼저 ${L(t)}을(를) 눈금실린더에 부어야 부피를 잴 수 있어요.`);
  }
  if (s.cyl.solids.length > 0) {
    return fail(s, "volume_with_solid", `눈금실린더에 고체가 들어 있어서 ${L(t)}만의 부피를 읽을 수 없어요. 고체를 넣기 전에 측정하세요.`);
  }
  const m = measured(`volume.${t}.t${ctx.trial}`, t as string, round1(ctx.noise(s.cyl.volume, { resolution: 0.1 })));
  const state = { ...s, measured: { ...s.measured, volume: m }, shown: { ...s.shown, cyl: true } };
  return { state, measurements: [mkMeasurement(m, "부피", "mL", ctx.trial)], event: { type: "measureVol", name: t, volume: m.value, note: fixJosa(`눈금실린더 눈금을 눈높이에서 읽었어요: ${L(t)} ${fmtNum(m.value)} mL`) } };
}

function measureSolidMass(s: DensityState, t: string, ctx: ReduceContext): Out {
  if (s.cyl.solids.includes(t)) {
    return fail(s, "mass_after_submerge", `${L(t)}은(는) 이미 눈금실린더 안에 있어요. 고체는 물에 넣기 전에 먼저 질량을 재야 해요. (젖은 고체는 질량이 달라질 수 있어요)`);
  }
  const withSolid = { ...s, scaleSolid: t, shown: { ...s.shown, scale: true } };
  const m = measured(`mass.${t}.t${ctx.trial}`, t, readScale(withSolid, ctx));
  const state = { ...withSolid, measured: { ...withSolid.measured, mass: m } };
  return { state, measurements: [mkMeasurement(m, "질량", "g", ctx.trial)], event: { type: "measureMass", name: t, mass: m.value, solid: true, note: fixJosa(`${L(t)}을(를) 저울에 올렸어요: ${fmtNum(m.value)} g`) } };
}

function liquidMassProblem(s: DensityState, t: string): Out | null {
  const item = s.scale.item;
  if (!item) {
    return fail(s, "mass_no_tare", "전자저울 위에 용기가 없어요. 먼저 '눈금실린더를 전자저울에 올린 다음, 영점조정을 한다'를 해야 해요.");
  }
  const c = item === "cylinder" ? s.cyl : s.bkr;
  const other = item === "cylinder" ? s.bkr : s.cyl;
  if (c.liquid !== t || c.volume <= 0) {
    return other.liquid === t && other.volume > 0
      ? fail(s, "mass_wrong_container", `${L(t)}은(는) ${L(item === "cylinder" ? "beaker" : "cylinder")}에 있어요. 저울 위의 ${L(item)}에 들어 있어야 질량을 잴 수 있어요.`)
      : fail(s, "mass_nothing", `전자저울 위의 ${L(item)}에 ${L(t)}이(가) 없어요. 먼저 ${L(t)}을(를) 부어야 해요.`);
  }
  if (item === "cylinder" && s.cyl.solids.length > 0) {
    return fail(s, "mass_with_solid", "눈금실린더에 고체가 들어 있어서 액체만의 질량을 잴 수 없어요.");
  }
  return null;
}

function measureMass(s: DensityState, step: Step, ctx: ReduceContext): Out {
  const t = eq(step, 0);
  if (isSolid(t)) return measureSolidMass(s, t as string, ctx);
  if (!isLiquid(t)) return fail(s, "mass_not_substance", `${L(t)}의 질량은 이 블록으로 잴 수 없어요. 측정할 물질을 넣어 주세요.`);
  const problem = liquidMassProblem(s, t as string);
  if (problem) return problem;
  const base = { ...s, scaleSolid: null };
  const m = measured(`mass.${t}.t${ctx.trial}`, t as string, readScale(base, ctx));
  const state = { ...base, measured: { ...base.measured, mass: m } };
  return { state, measurements: [mkMeasurement(m, "질량", "g", ctx.trial)], event: { type: "measureMass", name: t, mass: m.value, solid: false, note: fixJosa(`저울이 ${L(t)}의 질량 ${fmtNum(m.value)} g을 가리켜요.`) } };
}

function calcRequest(s: DensityState, ctx: ReduceContext): Out {
  const { mass, volume } = s.measured;
  if (!mass && !volume) return fail(s, "calc_nothing", "아직 측정한 값이 없어요. 질량과 부피를 먼저 측정해야 해요.");
  if (!mass) return fail(s, "calc_no_mass", "질량을 아직 측정하지 않았어요. 먼저 질량을 측정해야 해요.");
  if (!volume) return fail(s, "calc_no_volume", "부피를 아직 측정하지 않았어요. 먼저 부피를 측정해야 해요.");
  if (mass.name !== volume.name) {
    return fail(s, "calc_mismatch", `질량은 ${L(mass.name)}, 부피는 ${L(volume.name)}을(를) 측정했어요. 같은 물질의 값이어야 계산할 수 있어요.`);
  }
  const request = { key: `density.${mass.name}.t${ctx.trial}`, trial: ctx.trial, label: "밀도", unit: "g/mL", subject: mass.name, inputs: [mass.key, volume.key] };
  const cleaned = { ...initialDensityState(), shown: { ...s.shown, bkr: false } };
  return { state: cleaned, calcRequests: [request], endTrial: true, event: { type: "calc", name: mass.name, note: fixJosa(`${L(mass.name)}의 질량과 부피를 표에 옮겼어요. 밀도는 직접 계산해서 표에 입력해요. 도구는 깨끗이 정리했어요.`) } };
}

function addVolumeOut(s: DensityState, step: Step, ctx: ReduceContext): Out {
  const cont = eq(step, 0);
  const sub = eq(step, 1);
  const amt = num(step, 2);
  if (!isContainer(cont)) return fail(s, "add_not_container", `${L(cont)}에는 액체를 넣을 수 없어요. 비커나 눈금실린더를 넣어 주세요.`);
  if (!isLiquid(sub)) {
    return isSolid(sub)
      ? fail(s, "add_solid_ml", `${L(sub)}은(는) 고체라서 mL로 넣을 수 없어요. '(  )을(를) (  )에 넣는다' 블록을 써 보세요.`)
      : fail(s, "add_not_liquid", `${L(sub)}은(는) 넣을 수 있는 물질이 아니에요. 물이나 식용유를 넣어 주세요.`);
  }
  return pourOut(addLiquid(s, cont, sub as string, amt, ctx), cont, sub as string, amt);
}

function dropSolid(s: DensityState, sub: string, cont: ContainerId, ctx: ReduceContext): Out {
  if (cont !== "cylinder") return fail(s, "solid_not_cylinder", "고체의 부피는 물이 든 눈금실린더에 넣어서 재요. 두 번째 칸에 눈금실린더를 넣어 주세요.");
  if (s.cyl.volume <= 0) return fail(s, "solid_no_water", "눈금실린더에 아직 액체가 없어요. 먼저 물(또는 식용유)을 부어야 해요.");
  const before = round1(ctx.noise(cylLevel(s, ctx), { resolution: 0.1 }));
  const after = round1(ctx.noise(cylLevel(s, ctx) + ctx.param(`${sub}.volume`), { resolution: 0.1 }));
  if (after > CYL_MAX) return fail(s, "over_capacity", `${L(sub)}을(를) 넣으면 눈금이 ${CYL_MAX}mL를 넘어요. 액체의 양을 줄여 보세요.`);
  const state: DensityState = {
    ...s,
    cyl: { ...s.cyl, solids: [...s.cyl.solids, sub] },
    scaleSolid: s.scaleSolid === sub ? null : s.scaleSolid,
    lastInsert: { name: sub, before, after },
    shown: { ...s.shown, cyl: true },
  };
  return { state, event: { type: "dropSolid", name: sub, before, after, note: fixJosa(`핀셋으로 ${L(sub)}을(를) 눈금실린더에 살며시 넣었어요.`) } };
}

function transferLiquid(s: DensityState, sub: string, cont: ContainerId, ctx: ReduceContext): Out {
  const src = s.cyl.liquid === sub && s.cyl.volume > 0 ? "cylinder" : s.bkr.liquid === sub && s.bkr.volume > 0 ? "beaker" : null;
  if (!src) return fail(s, "transfer_nothing", `넣을 ${L(sub)}이(가) 아직 없어요. 먼저 눈금실린더에 부어야 해요.`);
  if (src === cont) return fail(s, "transfer_same", `${L(sub)}은(는) 이미 ${L(cont)}에 들어 있어요.`);
  if (src === "cylinder" && s.cyl.solids.length > 0) return fail(s, "transfer_with_solid", "눈금실린더에 고체가 들어 있어서 액체만 옮길 수 없어요.");
  const dest = cont === "cylinder" ? s.cyl : s.bkr;
  if (dest.liquid && dest.liquid !== sub && dest.volume > 0) return fail(s, "liquid_mix", `${L(cont)}에 이미 ${L(dest.liquid)}이(가) 들어 있어요. 다른 액체와 섞을 수 없어요.`);
  const vol = src === "cylinder" ? s.cyl.volume : s.bkr.volume;
  const destNow = cont === "cylinder" ? cylLevel(s, ctx) : s.bkr.volume;
  if (destNow + vol > (cont === "cylinder" ? CYL_MAX : BKR_MAX)) return fail(s, "over_capacity", `${L(cont)}에 다 담기지 않아요.`);
  const emptied = { liquid: null, volume: 0 };
  const filled = { liquid: sub, volume: round1(dest.volume + vol) };
  const state: DensityState = cont === "cylinder"
    ? { ...s, cyl: { ...s.cyl, ...filled }, bkr: { ...s.bkr, ...emptied }, shown: { ...s.shown, cyl: true, bkr: true } }
    : { ...s, bkr: { ...s.bkr, ...filled }, cyl: { ...s.cyl, ...emptied }, shown: { ...s.shown, cyl: true, bkr: true } };
  return { state, event: { type: "transfer", liquid: sub, from: src, to: cont, volume: vol, note: fixJosa(`${L(sub)}을(를) ${L(src)}에서 ${L(cont)}(으)로 옮겼어요.`) } };
}

function putInto(s: DensityState, step: Step, ctx: ReduceContext): Out {
  const sub = eq(step, 0);
  const cont = eq(step, 1);
  if (!isContainer(cont)) return fail(s, "put_not_container", `${L(cont)}에는 넣을 수 없어요. 두 번째 칸에는 비커나 눈금실린더를 넣어 주세요.`);
  if (isSolid(sub)) return dropSolid(s, sub as string, cont, ctx);
  if (isLiquid(sub)) return transferLiquid(s, sub as string, cont, ctx);
  return fail(s, "put_not_substance", `${L(sub)}은(는) 이 칸에 넣을 수 없어요. 물질(물, 식용유, 철조각)을 넣어 주세요.`);
}

function measureChange(s: DensityState, step: Step, ctx: ReduceContext): Out {
  const t = eq(step, 0);
  const li = s.lastInsert;
  if (!li) return fail(s, "change_nothing", "아직 눈금실린더에 고체를 넣지 않았어요. 먼저 고체를 눈금실린더에 넣어야 부피변화를 잴 수 있어요.");
  if (t !== "cylinder" && t !== li.name) {
    return isSolid(t)
      ? fail(s, "change_wrong_solid", `방금 눈금실린더에 넣은 고체는 ${L(li.name)}이에요. 그 고체나 눈금실린더를 넣어 주세요.`)
      : fail(s, "change_wrong_target", "부피변화는 눈금실린더(또는 방금 넣은 고체)로 측정해요.");
  }
  const m = measured(`volume.${li.name}.t${ctx.trial}`, li.name, round1(li.after - li.before));
  const state = { ...s, measured: { ...s.measured, volume: m }, shown: { ...s.shown, cyl: true } };
  return { state, measurements: [mkMeasurement(m, "부피", "mL", ctx.trial)], event: { type: "measureChange", name: li.name, before: li.before, after: li.after, volume: m.value, note: `눈금이 ${fmtNum(li.before)} mL에서 ${fmtNum(li.after)} mL로 올라갔어요.` } };
}

const HANDLERS: Record<string, (s: DensityState, step: Step, ctx: ReduceContext) => Out> = {
  a1: zeroScale,
  a2: pourIntoCylinder,
  a3: measureVolume,
  a4: measureMass,
  a5: (s, _step, ctx) => calcRequest(s, ctx),
  a6: addVolumeOut,
  a7: putInto,
  a8: measureChange,
};

export function reduceDensity(s: DensityState, step: Step, ctx: ReduceContext): Out {
  const h = HANDLERS[step.action];
  return h ? h(s, step, ctx) : fail(s, "unknown_block", "알 수 없는 블록이에요.");
}
