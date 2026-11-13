/**
 * 행동 블록 자동 줄바꿈 — 빈칸에 블록을 끼우면 블록 폭을 재서 숨은 줄바꿈 입력(BRn)을 켜고 끈다.
 * 짧으면 한 줄, 한 줄(MAX_ROW)을 넘으면 두 줄로 — 두 줄의 길이가 가장 비슷해지는 자리에서 한 번만 꺾는다.
 * 그래도 한 줄이 MAX_LINE(화면 폭)을 넘을 만큼 긴 블록만 세 줄 이상이 된다.
 * 블록마다 원래 길이는 살려 서로 구분되게 한다(폭을 억지로 같게 맞추지 않음).
 * (사용자 요청 2026-10-29 "다른 블록이랑 어울리게 길이 자동 수정", 2026-11-13 "세 줄은 되지 않게 두 줄 정도")
 */
import * as Blockly from "blockly/core";

/** 이 폭까지는 한 줄(작업판 단위 px) */
export const MAX_ROW = 300;
/** 두 줄로 꺾었을 때 한 줄이 넘지 않을 폭 — 꾸러미를 연 조립판 화면 안에 들어오는 폭 */
export const MAX_LINE = 400;
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

const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);

/** 앞에서부터 채우다 limit를 넘으면 꺾는 방식 — 줄바꿈 입력마다 켤지(true) 끌지 */
function greedy(widths: number[], limit: number): boolean[] {
  let line = widths[0];
  return widths.slice(1).map((next) => {
    const wrap = line + next > limit;
    line = wrap ? next : line + next;
    return wrap;
  });
}

/** 한 번만 꺾어 두 줄 중 긴 줄이 가장 짧아지는 줄바꿈 자리(없으면 -1) */
function bestSplit(widths: number[]): { at: number; longest: number } {
  const total = sum(widths);
  return widths.slice(1).reduce((best, _, k) => {
    const first = sum(widths.slice(0, k + 1));
    const longest = Math.max(first, total - first);
    return longest < best.longest ? { at: k, longest } : best;
  }, { at: -1, longest: Number.POSITIVE_INFINITY });
}

/** 줄바꿈 입력마다 켤지 정한다: 한 줄 → 고른 두 줄 → (아주 길 때만) 여러 줄 */
function plan(widths: number[]): boolean[] {
  const none = widths.slice(1).map(() => false);
  if (sum(widths) <= MAX_ROW) return none;
  const split = bestSplit(widths);
  if (split.at >= 0 && split.longest <= MAX_LINE) return none.map((_, k) => k === split.at);
  return greedy(widths, MAX_LINE);
}

/** 줄바꿈을 정하고, 바뀐 것이 있으면 true */
export function layoutAction(block: Blockly.Block, measure = false): boolean {
  const { breaks, widths } = segments(block, measure);
  const wraps = plan(widths);
  return breaks.reduce((changed, br, k) => {
    if (br.isVisible() === wraps[k]) return changed;
    br.setVisible(wraps[k]);
    return true;
  }, false);
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
