import { describe, expect, it } from "vitest";
import { editorDiagnostics } from "@/components/lab/editorDiagnostics";
import type { Diagnostic } from "@/lib/engine/types";

const d = (code: string, severity: Diagnostic["severity"], guideline: Diagnostic["guideline"] = "2.3"): Diagnostic => ({ blockId: "b", code, severity, guideline, message: code });
const all = [d("slot_invalid", "error"), d("mass_no_tare", "error"), d("controlled_var_mismatch", "warn")];

describe("교사 설정: 편집 중 점검 수준 (지침 2.4·4.4)", () => {
  it("all: 전부", () => expect(editorDiagnostics(all, "all")).toHaveLength(3));
  it("slots: 빈 칸·변인 설계만, 순서 오류는 실행 때", () => expect(editorDiagnostics(all, "slots").map((x) => x.code)).toEqual(["slot_invalid", "controlled_var_mismatch"]));
  it("none: 편집 중에는 없음(평가용)", () => expect(editorDiagnostics(all, "none")).toEqual([]));
});
