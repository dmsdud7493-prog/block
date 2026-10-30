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

/** 준비물·수치·위치 블록 옆의 ⊗ 단추 (원래 프로토타입) — 회색 동그라미에 흰 ✕ */
const REMOVE_ICON = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.5" fill="#ffffff" fill-opacity="0.85"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="#6b7785" stroke-width="2" stroke-linecap="round"/></svg>',
);

/** 누르면 그 블록만 빼낸다(행동 블록과 나머지 순서는 그대로). 꾸러미 안의 블록에는 달지 않는다 */
function addRemoveButton(block: Blockly.Block) {
  if (block.isInFlyout || block.workspace.isFlyout) return;
  const last = block.inputList[block.inputList.length - 1];
  const field = new Blockly.FieldImage(REMOVE_ICON, 18, 18, "삭제", (f) => {
    const b = f.getSourceBlock();
    if (b && b.isDeletable() && !b.isInFlyout) (b as Blockly.BlockSvg).dispose(false, true);
  });
  last?.appendField(field, "REMOVE");
}

let registered = false;

/** 블록 정의에 쓰는 확장 — 새 블록이 만들어질 때 글자 수로 먼저 한 번 접는다 */
export function registerAutoWrap() {
  if (registered) return;
  if (!Blockly.Extensions.isRegistered("lab_autowrap")) {
    Blockly.Extensions.register("lab_autowrap", function (this: Blockly.Block) {
      layoutAction(this);
    });
  }
  if (!Blockly.Extensions.isRegistered("lab_removable")) {
    Blockly.Extensions.register("lab_removable", function (this: Blockly.Block) {
      addRemoveButton(this);
    });
  }
  registered = true;
}

/** 작업판의 모든 행동 블록을 실제 폭으로 다시 접는다 */
export function relayoutWorkspace(ws: Blockly.WorkspaceSvg) {
  ws.getAllBlocks(false).filter((b) => b.inputList.some(isBreak)).forEach((b) => {
    if (layoutAction(b, true)) void (b as Blockly.BlockSvg).queueRender();
  });
}
