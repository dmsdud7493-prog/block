/**
 * 조립판 렌더러 — Blockly zelos를 그대로 쓰되, 작업판에 놓인 행동(문장) 블록은 폭을 똑같이 맞춘다.
 * 빈칸에 준비물·수치를 끼우면 글자 길이에 따라 블록 폭이 들쑥날쑥해지므로, 모자란 폭은 오른쪽 여백으로 채운다
 * (사용자 요청 2026-11-12: "블럭 길이 자동 맞춤"). 줄바꿈은 autoWrap.ts가 MAX_ROW 기준으로 정한다.
 * 꾸러미(플라이아웃) 안의 블록은 원래 폭 그대로 둔다 — 꾸러미가 넓어지지 않게.
 */
import * as Blockly from "blockly/core";

/** 행동 블록의 최소 공통 폭(작업판 단위). 이보다 넓은 행동 블록이 있으면 모두 그 폭에 맞춘다 */
export const ACTION_MIN_WIDTH = 320;

/** 블록마다 여백 없이 잰 원래 폭, 조립판마다 맞출 공통 폭 */
const natural = new WeakMap<Blockly.BlockSvg, number>();
const target = new WeakMap<Blockly.Workspace, number>();

const padded = (block: Blockly.BlockSvg) => block.type.startsWith("act_") && !block.isInFlyout && !block.workspace.isFlyout;

class LabRenderInfo extends Blockly.zelos.RenderInfo {
  private readonly lab: Blockly.BlockSvg;

  constructor(renderer: Blockly.zelos.Renderer, block: Blockly.BlockSvg) {
    super(renderer, block);
    this.lab = block;
  }

  protected override computeBounds_(): void {
    super.computeBounds_();
    if (!padded(this.lab)) return;
    natural.set(this.lab, this.width);
    const w = Math.max(ACTION_MIN_WIDTH, target.get(this.lab.workspace) ?? 0);
    if (this.width >= w) return;
    this.width = w;
    this.widthWithChildren = Math.max(this.widthWithChildren, w);
  }
}

/** 조립판의 행동 블록 중 가장 넓은 원래 폭으로 공통 폭을 정하고, 바뀌었으면 행동 블록을 다시 그린다 */
export function equalizeActionWidths(ws: Blockly.WorkspaceSvg) {
  const blocks = ws.getAllBlocks(false).filter(padded);
  const widest = blocks.reduce((m, b) => Math.max(m, natural.get(b) ?? 0), 0);
  const w = Math.max(ACTION_MIN_WIDTH, Math.ceil(widest));
  if (target.get(ws) === w) return;
  target.set(ws, w);
  blocks.forEach((b) => b.queueRender());
}

class LabRenderer extends Blockly.zelos.Renderer {
  protected override makeRenderInfo_(block: Blockly.BlockSvg): LabRenderInfo {
    return new LabRenderInfo(this, block);
  }
}

export const LAB_RENDERER = "lab_zelos";

export function registerLabRenderer() {
  try {
    Blockly.blockRendering.register(LAB_RENDERER, LabRenderer);
  } catch {
    // 이미 등록됨(같은 페이지에서 작업판을 다시 만들 때)
  }
}
