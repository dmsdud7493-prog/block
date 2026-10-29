/**
 * Blockly 테마 — 원래 프로토타입(엔트리·스크래치식)의 블록 색을 따른다.
 * 준비물 하늘 #4cbfe6 · 용량/수치 분홍 #ff6680 · 위치 민트 #0fbd8c · 행동 노랑 #ffbf00 (글자는 진한 남색, 대비 5:1 이상 — globals.css)
 * 시작 블록은 남색 머리줄 색 #2c3e50(흰 글자).
 */
import * as Blockly from "blockly/core";

const style = (colourPrimary: string, colourSecondary: string, colourTertiary: string, hat?: string) => ({ colourPrimary, colourSecondary, colourTertiary, ...(hat ? { hat } : {}) });

export const labTheme = Blockly.Theme.defineTheme("matterLab", {
  name: "matterLab",
  base: Blockly.Themes.Classic,
  blockStyles: {
    hat_blocks: style("#2c3e50", "#46607a", "#1b2733", "cap"),
    equip_blocks: style("#4cbfe6", "#9fdcf2", "#2a9cc4"),
    quant_blocks: style("#ff6680", "#ffa3b3", "#d94a64"),
    pos_blocks: style("#0fbd8c", "#7fdcc0", "#0b946d"),
    action_blocks: style("#ffbf00", "#ffd966", "#cc9900"),
  },
  fontStyle: {
    family: "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
    weight: "700",
    size: 12,
  },
  componentStyles: {
    workspaceBackgroundColour: "#fafafa",
    toolboxBackgroundColour: "#f8f9fa",
    toolboxForegroundColour: "#3b4654",
    flyoutBackgroundColour: "#ffffff",
    flyoutForegroundColour: "#1f2d3d",
    flyoutOpacity: 1,
    scrollbarColour: "#a9b6c4",
    insertionMarkerColour: "#2d7cff",
    insertionMarkerOpacity: 0.45,
  },
});
