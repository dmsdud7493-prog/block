/**
 * 빈칸(값 입력) 다루기 도우미 — 학생이 블록을 정확히 끌어다 놓지 않아도 끼우고 뺄 수 있게.
 * - tapInsert: 행동 블록을 고른 채 꾸러미의 준비물을 누르면 첫 빈칸에 끼운다.
 *   빈칸에 끼워진 준비물을 고른 채 누르면 그 준비물을 바꾼다.
 * - removeNested: 행동 블록 안에 끼운 블록만 뺀다(행동 블록과 나머지 순서는 그대로)
 */
import * as Blockly from "blockly/core";

/** 빈칸 종류(check)가 맞는가 — 꾸러미 블록은 다른 작업판에 있어 Blockly 연결 검사기를 쓸 수 없으므로 종류만 비교한다 */
export function canFit(input: Blockly.Input, child: Blockly.Block): boolean {
  const out = child.outputConnection;
  if (!input.connection || !out) return false;
  const a = input.connection.getCheck();
  const b = out.getCheck();
  return !a || !b || a.some((t) => b.includes(t));
}

export function firstEmptyFitting(target: Blockly.Block, child: Blockly.Block): Blockly.Connection | null {
  const input = target.inputList.find((i) => i.connection && !i.connection.targetBlock() && canFit(i, child));
  return input?.connection ?? null;
}

/** 행동 블록 안에 끼워진 값 블록인가(준비물·수치·위치) */
export function isNested(block: Blockly.Block | null): block is Blockly.BlockSvg {
  return Boolean(block?.outputConnection?.targetBlock() && block.isDeletable());
}

export function removeNested(block: Blockly.BlockSvg): void {
  block.dispose(false, true);
}

function copyInto(ws: Blockly.WorkspaceSvg, source: Blockly.Block): Blockly.BlockSvg {
  const state = Blockly.serialization.blocks.save(source, { saveIds: false, addCoordinates: false, addNextBlocks: false });
  return Blockly.serialization.blocks.append(state as Blockly.serialization.blocks.State, ws) as Blockly.BlockSvg;
}

export interface TapResult { msg: string; selectId: string | null }

/** 꾸러미 블록을 눌렀을 때: 고른 블록에 끼우거나 바꾼다. 다음 빈칸도 이어서 채우도록 행동 블록을 계속 고른 상태로 둔다 */
export function tapInsert(ws: Blockly.WorkspaceSvg, source: Blockly.Block, selectedId: string | null): TapResult | null {
  if (!source.outputConnection) return null;
  const say = (msg: string, selectId: string | null = selectedId): TapResult => ({ msg, selectId });
  const sel = selectedId ? ws.getBlockById(selectedId) : null;
  if (!sel) return say("끼울 행동 블록을 먼저 한 번 눌러 고른 다음, 준비물을 누르면 빈칸에 쏙 들어가요.");
  const replaceAt = isNested(sel) ? sel.outputConnection!.targetConnection : null;
  const parent = replaceAt ? replaceAt.getSourceBlock() : sel;
  const input = replaceAt ? parent.inputList.find((i) => i.connection === replaceAt) ?? null : null;
  if (input && !canFit(input, source)) return say("이 빈칸에는 그 블록이 들어가지 않아요. 다른 블록을 골라 볼까요?");
  const slot = replaceAt ?? firstEmptyFitting(parent, source);
  if (!slot) return say("고른 블록에 이 블록이 들어갈 빈칸이 없어요. 빈칸이 있는 행동 블록을 골라 보세요.");
  Blockly.Events.setGroup(true);
  try {
    if (replaceAt) (sel as Blockly.BlockSvg).dispose(false);
    const made = copyInto(ws, source);
    slot.connect(made.outputConnection!);
    (parent as Blockly.BlockSvg).select();
    return say(replaceAt ? "블록을 바꿨어요." : "빈칸에 끼웠어요. 다음 빈칸도 준비물을 눌러 채울 수 있어요.", parent.id);
  } finally {
    Blockly.Events.setGroup(false);
  }
}
