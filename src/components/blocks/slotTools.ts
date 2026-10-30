/**
 * 빈칸(값 입력) 다루기 도우미 — 학생이 블록을 정확히 끌어다 놓지 않아도 끼우고 뺄 수 있게.
 * 준비물·수치 블록은 학생이 원하는 빈칸에 직접 끌어 넣는다(자동으로 빈칸을 채우지 않는다 — 순서가 꼬이지 않게).
 * - removeNested: 행동 블록 안에 끼운 블록만 뺀다(행동 블록과 나머지 순서는 그대로)
 */
import * as Blockly from "blockly/core";

/** 행동 블록 안에 끼워진 값 블록인가(준비물·수치·위치) */
export function isNested(block: Blockly.Block | null): block is Blockly.BlockSvg {
  return Boolean(block?.outputConnection?.targetBlock() && block.isDeletable());
}

export function removeNested(block: Blockly.BlockSvg): void {
  block.dispose(false, true);
}
