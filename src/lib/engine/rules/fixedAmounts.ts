/**
 * 정해 준 양 검사 (ADR-P26, 지침 2.3) — 교사가 '넣는 양 정해 주기'로 배정한 실험에서
 * 정해 둔 준비물을 다른 양으로 넣으면 실행 전에 그 블록에 알린다. 빠진 준비물은 다른 규칙이 다룬다.
 */
import type { Diagnostic, Step } from "../types";
import type { AnyCatalog } from "../experiments/types";
import { fixJosa } from "../format";

const labelOf = (c: AnyCatalog, id: string) => c.items.find((i) => i.id === id)?.label ?? id;

/** 한 블록 — 정해 둔 준비물과 양이 함께 있으면 양을 비교한다 */
function issueOf(c: AnyCatalog, step: Step): Diagnostic | null {
  const quant = step.slots.find((v) => v?.kind === "quant");
  if (!quant || quant.kind !== "quant") return null;
  const fixed = (c.fixedAmounts ?? []).find((f) => step.slots.some((v) => v?.kind === "equip" && v.id === f.item));
  if (!fixed || (quant.value === fixed.value && quant.unit === fixed.unit)) return null;
  return {
    blockId: step.blockId, severity: "error", code: "fixed_amount", guideline: "2.3",
    message: fixJosa(`이번 실험은 넣는 양이 정해져 있어요. ${labelOf(c, fixed.item)}은(는) ${fixed.value} ${fixed.unit}만큼 넣어 주세요(지금 ${quant.value} ${quant.unit}).`),
  };
}

export function checkFixedAmounts(c: AnyCatalog, steps: Step[]): Diagnostic[] {
  return steps.map((s) => issueOf(c, s)).filter((d): d is Diagnostic => d !== null);
}

/** 미션 칸에 보여 줄 한 줄 — "뜨거운 물 100 g · 붕산 10 g · 황산 구리(II) 1 g" */
export const fixedAmountsText = (c: AnyCatalog): string => (c.fixedAmounts ?? []).map((f) => `${labelOf(c, f.item)} ${f.value} ${f.unit}`).join(" · ");
