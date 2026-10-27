/** 블록 → 문장 ("눈금실린더를 전자저울에 올린 다음, 영점조정을 한다") — 튜터 상태 요약·보고서 과정 초안에 쓴다 */
import type { AnyCatalog } from "../experiments/types";
import type { SlotValue, Step } from "../types";
import { fixJosa, fmtNum } from "../format";

function slotText(catalog: AnyCatalog, v: SlotValue | null): string {
  if (!v) return "(  )";
  if (v.kind === "quant") return `${fmtNum(v.value)}${v.unit}`;
  if (v.kind === "pos") return catalog.positions.find((p) => p.id === v.id)?.label ?? v.id;
  return catalog.items.find((i) => i.id === v.id)?.label ?? v.id;
}

export function renderStep(catalog: AnyCatalog, step: Step): string {
  const def = catalog.actions.find((a) => a.id === step.action);
  if (!def) return "(알 수 없는 블록)";
  const parts = def.text.split("(  )");
  const text = parts.reduce((acc, p, i) => (i === 0 ? p : acc + slotText(catalog, step.slots[i - 1] ?? null) + p), "");
  return fixJosa(text);
}

export function renderProgram(catalog: AnyCatalog, steps: Step[]): string[] {
  return steps.map((s) => renderStep(catalog, s));
}
