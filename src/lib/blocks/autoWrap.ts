/**
 * 행동 블록 자동 줄바꿈 — 빈칸에 블록을 끼우면 블록 폭을 재서, 한 줄이 MAX_ROW를 넘지 않도록
 * 숨은 줄바꿈 입력(BRn)을 켜고 끈다. 그래서 조립한 블록들의 폭이 서로 비슷하게 유지된다.
 * (사용자 요청 2026-10-29: "조립이 되면 다른 블록이랑 어울리게 길이가 자동 수정")
 */
import * as Blockly from "blockly/core";

/** 한 줄 최대 폭(작업판 단위 px) */
export const MAX_ROW = 300;
const EMPTY_SLOT = 44;
const CHAR = 11;

const isBreak = (input: Blockly.Input) => input.name.startsWith("BR");

/**
 * measure=true(작업판에 이미 그려진 블록)면 실제 폭, false(블록을 만드는 중)면 글자 수로 어림.
 * 만드는 중에 getSize()를 부르면 Blockly가 글자를 그리기 전에 "그렸음"으로 표시해 글자가 빈칸으로 남는다.
 */
function fieldWidth(field: Blockly.Field, measure: boolean): number {
  const w = measure && field.getSvgRoot() ? field.getSize().width : 0;
  return w > 0 ? w : String(field.getText() ?? "").length * CHAR + 6;
}

function childWidth(input: Blockly.Input, measure: boolean): number {
  const child = input.connection?.targetBlock() as Blockly.BlockSvg | null | undefined;
  if (child) {
    const w = measure && child.getSvgRoot() ? child.getHeightWidth().width : 0;
    return w > 0 ? w : EMPTY_SLOT * 2;
  }
  return input.type === Blockly.inputs.inputTypes.VALUE ? EMPTY_SLOT : 0;
}

const inputWidth = (input: Blockly.Input, measure: boolean) => input.fieldRow.reduce((n, f) => n + fieldWidth(f, measure), 0) + childWidth(input, measure);

/** 줄바꿈 입력 사이 구간의 폭 목록 */
function segments(block: Blockly.Block, measure: boolean): { breaks: Blockly.Input[]; widths: number[] } {
  return block.inputList.reduce<{ breaks: Blockly.Input[]; widths: number[] }>((acc, input) => {
    if (isBreak(input)) return { breaks: [...acc.breaks, input], widths: [...acc.widths, 0] };
    const widths = [...acc.widths];
    widths[widths.length - 1] += inputWidth(input, measure);
    return { breaks: acc.breaks, widths };
  }, { breaks: [], widths: [0] });
}

/** 줄바꿈을 정하고, 바뀐 것이 있으면 true */
export function layoutAction(block: Blockly.Block, measure = false): boolean {
  const { breaks, widths } = segments(block, measure);
  let line = widths[0];
  let changed = false;
  breaks.forEach((br, k) => {
    const next = widths[k + 1];
    const wrap = line + next > MAX_ROW;
    line = wrap ? next : line + next;
    if (br.isVisible() !== wrap) {
      br.setVisible(wrap);
      changed = true;
    }
  });
  return changed;
}

let registered = false;

/** 블록 정의에 쓰는 확장 — 새 블록이 만들어질 때 글자 수로 먼저 한 번 접는다 */
export function registerAutoWrap() {
  if (registered || Blockly.Extensions.isRegistered("lab_autowrap")) {
    registered = true;
    return;
  }
  Blockly.Extensions.register("lab_autowrap", function (this: Blockly.Block) {
    layoutAction(this);
  });
  registered = true;
}

/** 작업판의 모든 행동 블록을 실제 폭으로 다시 접는다 */
export function relayoutWorkspace(ws: Blockly.WorkspaceSvg) {
  ws.getAllBlocks(false).filter((b) => b.inputList.some(isBreak)).forEach((b) => {
    if (layoutAction(b, true)) void (b as Blockly.BlockSvg).queueRender();
  });
}
