/** 빈 구멍·종류 불일치·수치 범위 검사 (프로토타입 checkSlots 일반화, 지침 2.3) */
import type { ActionBlockDef, Diagnostic, Step } from "../types";

const KIND_LABEL: Record<string, string> = {
  equip: "준비물",
  quant: "용량/수치",
  pos: "위치",
};

function slotProblem(def: ActionBlockDef, step: Step, i: number): string | null {
  const spec = def.slots[i];
  const v = step.slots[i] ?? null;
  if (!v) return `${i + 1}번째 빈 칸에 블록을 끼워 주세요.`;
  if (v.kind !== spec.accepts) {
    return `${i + 1}번째 칸에는 ${KIND_LABEL[spec.accepts]} 블록을 넣어야 해요.`;
  }
  if (v.kind !== "quant") return null;
  if (!(v.value > 0)) return `${i + 1}번째 칸 수치 블록에 0보다 큰 숫자를 입력해 주세요.`;
  if (spec.units && !spec.units.includes(v.unit)) {
    return `${i + 1}번째 칸에는 ${spec.units.join(" 또는 ")} 단위의 수치 블록을 넣어 주세요.`;
  }
  return null;
}

export function checkStepSlots(def: ActionBlockDef | undefined, step: Step): Diagnostic | null {
  if (!def) {
    return { blockId: step.blockId, severity: "error", code: "unknown_block", message: "이 실험에서 쓸 수 없는 블록이에요.", guideline: "2.3" };
  }
  const found = def.slots.map((_, i) => slotProblem(def, step, i)).find((m) => m !== null);
  if (!found) return null;
  return { blockId: step.blockId, severity: "error", code: "slot_invalid", message: found, guideline: "2.3" };
}

export function checkAllSlots(actions: ActionBlockDef[], steps: Step[]): Diagnostic[] {
  const byId = new Map(actions.map((a) => [a.id, a]));
  return steps
    .map((s) => checkStepSlots(byId.get(s.action), s))
    .filter((d): d is Diagnostic => d !== null);
}
