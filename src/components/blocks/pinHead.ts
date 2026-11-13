/**
 * 머리 블록 고정 — '실험 과정'(계획 블록이 있으면 '실험 계획 세우기') 머리 블록을 조립판 왼쪽 위에 둔다.
 * 블록 꾸러미(플라이아웃)가 열려 있으면 꾸러미 오른쪽으로 비켜 서고, 닫히면 다시 왼쪽으로 온다.
 * 블록을 옮기지 않고 화면(스크롤)을 맞추므로, 머리에 붙은 블록과 따로 놓인 블록의 자리 관계는 그대로다.
 * (사용자 요청 2026-11-12: "머리 블록 위치 고정, 행동 블럭 창이 길면 오른쪽으로 비켰다가 끄면 다시 왼쪽")
 */
import * as Blockly from "blockly/core";
import { T } from "@/lib/blocks/blockTypes";

const MARGIN = 18;

/** 조립판의 기준 머리 블록 — 계획 블록이 있으면 그것(맨 위), 없으면 실험 과정 */
export function headBlock(ws: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
  const tops = ws.getTopBlocks(false);
  return tops.find((b) => b.type === T.designStart) ?? tops.find((b) => b.type === T.procStart) ?? null;
}

/** 머리 블록은 끌어도 움직이지 않게 — 아래 블록은 지금처럼 떼고 붙일 수 있다 */
export function lockHeads(ws: Blockly.WorkspaceSvg) {
  ws.getTopBlocks(false).filter((b) => b.type === T.designStart || b.type === T.procStart).forEach((b) => b.setMovable(false));
}

/**
 * 머리 블록을 왼쪽 위 자리에 맞춘다.
 * 조립판 원점(스크롤 0)은 늘 '카테고리 줄 + 열린 꾸러미' 오른쪽 위 모서리에 온다(BlocklyWorkspace의 꾸러미 폭 보정).
 * 그래서 화면을 원점에 두고, 머리 블록을 원점에서 MARGIN만큼 떨어진 자리로 옮기면(나머지 블록도 같은 만큼)
 * 꾸러미가 열리면 오른쪽으로 비켜 서고 닫히면 다시 왼쪽으로 온다. Blockly가 블록을 더할 때 화면을 원점으로
 * 되돌리더라도 자리가 그대로다.
 */
export function pinHead(ws: Blockly.WorkspaceSvg) {
  const head = headBlock(ws);
  if (!head) return;
  // 블록을 끌고 있는 동안에는 건드리지 않고(끌던 블록이 밀려남), 놓은 뒤에 다시 맞춘다
  if (ws.isDragging() || Blockly.Gesture.inProgress()) {
    setTimeout(() => pinHeadSoon(ws), 250);
    return;
  }
  Blockly.svgResize(ws);
  const at = head.getRelativeToSurfaceXY();
  const dx = MARGIN / ws.scale - at.x;
  const dy = MARGIN / ws.scale - at.y;
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    // 자리 맞춤은 학생이 한 일이 아니므로 되돌리기 기록에 남기지 않는다
    Blockly.Events.disable();
    try {
      ws.getTopBlocks(false).forEach((b) => b.moveBy(dx, dy));
    } finally {
      Blockly.Events.enable();
    }
  }
  if (ws.scrollX !== 0 || ws.scrollY !== 0) ws.scroll(0, 0);
}

/** 다음 그리기 뒤에 맞춘다(꾸러미가 열리고 닫힌 뒤 크기가 정해진 다음) */
export const pinHeadSoon = (ws: Blockly.WorkspaceSvg) => requestAnimationFrame(() => requestAnimationFrame(() => pinHead(ws)));

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 화면을 굴릴 수 있는 범위(스크롤 값, px). 머리 블록이 원점에 있으므로 위·왼쪽(양수)으로는 못 가고,
 * 블록이 화면보다 길거나 넓을 때만 그만큼 아래·오른쪽(음수)으로 내려가 끝까지 볼 수 있다.
 */
function scrollRange(ws: Blockly.WorkspaceSvg): { minX: number; minY: number } {
  const box = ws.getBlocksBoundingBox();
  const view = ws.getMetricsManager().getViewMetrics();
  const k = ws.scale;
  return {
    minX: Math.min(0, view.width - box.right * k - MARGIN),
    minY: Math.min(0, view.height - box.bottom * k - MARGIN),
  };
}

/**
 * 휠·스크롤 막대로 화면을 굴려도 '실험 과정' 머리 블록이 아래로 내려가지 않게 한다
 * (사용자 요청 2026-11-13: "시작 블럭은 항상 제일 위에, 안 내려가게"). 순서가 길어 화면 아래로 넘칠 때만
 * 그 끝까지 내려 볼 수 있다. 휠은 ws.scroll을 거치므로 거기서 바로 막고, 스크롤 막대는 화면이 바뀐 뒤 되돌린다.
 */
export function keepHeadOnTop(ws: Blockly.WorkspaceSvg) {
  const raw = ws.scroll.bind(ws);
  ws.scroll = (x: number, y: number, hide?: boolean) => {
    const r = scrollRange(ws);
    raw(clamp(x, r.minX, 0), clamp(y, r.minY, 0), hide);
  };
  ws.addChangeListener((e: Blockly.Events.Abstract) => {
    if (e.type !== Blockly.Events.VIEWPORT_CHANGE || Blockly.Gesture.inProgress()) return;
    const r = scrollRange(ws);
    const x = clamp(ws.scrollX, r.minX, 0);
    const y = clamp(ws.scrollY, r.minY, 0);
    if (Math.abs(x - ws.scrollX) > 0.5 || Math.abs(y - ws.scrollY) > 0.5) ws.scroll(x, y);
  });
}
