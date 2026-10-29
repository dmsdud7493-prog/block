/** 교사 설정에 따른 편집 중 점검 안내 수준 (지침 2.4·4.4) */
import type { Diagnostic } from "@/lib/engine/types";

export interface LabSettings {
  hintLevelEditing: "none" | "slots" | "all";
}

export const DEFAULT_SETTINGS: LabSettings = { hintLevelEditing: "all" };

/** 편집 중 보여 줄 진단: none=실행 때만, slots=빈 칸·단위·변인 설계만, all=순서 오류까지 */
export function editorDiagnostics(diags: Diagnostic[], level: LabSettings["hintLevelEditing"]): Diagnostic[] {
  if (level === "all") return diags;
  if (level === "none") return [];
  return diags.filter((d) => d.code === "slot_invalid" || d.code === "unknown_block" || d.guideline === "2.3" && d.severity === "warn");
}
