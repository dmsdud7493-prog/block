/** Blockly 테마 — 대비 4.5:1 이상, 한국어 글꼴 */
import * as Blockly from "blockly/core";

export const labTheme = Blockly.Theme.defineTheme("matterLab", {
  name: "matterLab",
  base: Blockly.Themes.Classic,
  fontStyle: {
    family: "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
    weight: "600",
    size: 12,
  },
  componentStyles: {
    workspaceBackgroundColour: "#f8fafc",
    toolboxBackgroundColour: "#ffffff",
    toolboxForegroundColour: "#0f172a",
    flyoutBackgroundColour: "#f1f5f9",
    flyoutForegroundColour: "#0f172a",
    flyoutOpacity: 1,
    scrollbarColour: "#94a3b8",
    insertionMarkerColour: "#1d4ed8",
    insertionMarkerOpacity: 0.4,
  },
});
