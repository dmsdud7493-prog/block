/**
 * Blockly 작업 공간 → 엔진 Program 변환 (블록 id를 그대로 Step.blockId로 써서 진단을 블록에 되돌린다).
 * "🧪 실험 절차" 아래 블록만 절차, "🔬 변인 설계" 아래 블록만 변인 선언으로 읽는다.
 */
import type * as Blockly from "blockly/core";
import type { Program, SlotValue, Step, Unit, VariableDecl } from "@/lib/engine/types";
import { T } from "./blockTypes";

type B = Blockly.Block;

/** start 블록 아래로 이어진 블록들 (start 제외) */
function chain(start: B | null): B[] {
  const next = start ? start.getNextBlock() : null;
  return next ? [next, ...chain(next)] : [];
}

function unitFromType(type: string): Unit | null {
  if (!type.startsWith("quant_")) return null;
  return decodeURIComponent(type.slice("quant_".length).replace(/_/g, "%")) as Unit;
}

function slotValue(slug: string, target: B | null): SlotValue | null {
  if (!target) return null;
  const type = target.type;
  if (type.startsWith(`item_${slug}_`)) return { kind: "equip", id: type.slice(`item_${slug}_`.length) };
  if (type.startsWith(`pos_${slug}_`)) return { kind: "pos", id: type.slice(`pos_${slug}_`.length) };
  const unit = unitFromType(type);
  if (unit) return { kind: "quant", value: Number(target.getFieldValue("VALUE")), unit };
  return null;
}

function toStep(slug: string, block: B): Step | null {
  const prefix = `act_${slug}_`;
  if (!block.type.startsWith(prefix)) return null;
  const inputs = block.inputList.filter((i) => i.name.startsWith("S"));
  return {
    blockId: block.id,
    action: block.type.slice(prefix.length),
    slots: inputs.map((i) => slotValue(slug, i.connection?.targetBlock() ?? null)),
  };
}

function toDecl(slug: string, block: B): VariableDecl | null {
  const prefix = `var_${slug}_`;
  if (!block.type.startsWith(prefix)) return null;
  const optionId = String(block.getFieldValue("OPTION") ?? "__none");
  const why = String(block.getFieldValue("WHY") ?? "").trim();
  return {
    blockId: block.id,
    role: block.type.slice(prefix.length) as VariableDecl["role"],
    optionId: optionId === "__none" ? null : optionId,
    ...(why ? { rationale: why } : {}),
  };
}

export function workspaceToProgram(ws: Blockly.Workspace, slug: string): Program {
  const tops = ws.getTopBlocks(true);
  const proc = tops.find((b) => b.type === T.procStart) ?? null;
  const design = tops.find((b) => b.type === T.designStart) ?? null;
  return {
    experiment: slug,
    steps: chain(proc).map((b) => toStep(slug, b)).filter((s): s is Step => s !== null),
    variables: chain(design).map((b) => toDecl(slug, b)).filter((d): d is VariableDecl => d !== null),
  };
}

/** 절차·설계 스택 밖에 떨어진 행동/변인 블록 (안내용) */
export function looseBlockIds(ws: Blockly.Workspace): string[] {
  return ws.getTopBlocks(false)
    .filter((b) => b.type !== T.procStart && b.type !== T.designStart)
    .filter((b) => b.type.startsWith("act_") || b.type.startsWith("var_"))
    .map((b) => b.id);
}
