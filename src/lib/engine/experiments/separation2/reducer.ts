/**
 * 용해도 차를 이용한 혼합물 분리(재결정) 리듀서 — 프로토타입 mixture_separation_lab2.html의
 * applyStep을 불변 상태로 이식. 숫자는 ctx.param()/ctx.noise()로만 얻는다(dryRun에서는 NaN).
 *
 * 프로토타입과 다른 점: 식히지 않고 거르면(a7) 진행 대신 `filter_before_cool`로 멈춘다(오케스트레이터 요구).
 */
import type { ReduceContext } from "../types";
import type { Step } from "../../types";
import { addInto, cool, measureTemp, observe, stir } from "./dissolve";
import { checkResult, pourFilter, setupFilter, weighCrystals } from "./filter";
import { fail, type Out, type Separation2State } from "./model";

export type { Separation2State } from "./model";
export { initialSeparation2State } from "./model";

const HANDLERS: Record<string, (s: Separation2State, step: Step, ctx: ReduceContext) => Out> = {
  a1: addInto,
  a2: stir,
  a3: cool,
  a4: (s, step) => measureTemp(s, step),
  a5: (s) => observe(s),
  a6: (s, step) => setupFilter(s, step),
  a7: (s, step) => pourFilter(s, step),
  a8: (s, _step, ctx) => checkResult(s, ctx),
  a9: weighCrystals,
};

export function reduceSeparation2(s: Separation2State, step: Step, ctx: ReduceContext): Out {
  const h = HANDLERS[step.action];
  return h ? h(s, step, ctx) : fail(s, "unknown_block", "알 수 없는 블록이에요.");
}
