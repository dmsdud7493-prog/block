/** 지침 2.1: 도구 상자에는 조작·종속·통제 변인 3종 (ADR-P13), 나머지 3종은 예전 저장본 호환용 정의만 */
import { describe, expect, it } from "vitest";
import { VARIABLE_BLOCKS, variableBlockByRole } from "@/lib/engine/dsl/variableBlocks";
import { CATALOGS } from "@/lib/engine/experiments";
import { toolbox, variableBlocks } from "@/lib/blocks/blockTypes";

const ROLES = ["independent", "dependent", "controlled", "experimental_group", "comparison_group", "method"] as const;

describe("변인 설계 블록 (지침 2.1)", () => {
  it("6종 역할이 하나씩 있다", () => {
    expect(VARIABLE_BLOCKS.map((b) => b.role).sort()).toEqual([...ROLES].sort());
    ROLES.forEach((r) => expect(variableBlockByRole(r)).toBeTruthy());
  });
  it.each(Object.keys(CATALOGS))("%s 도구 상자에 변인 블록 3종만, '왜?' 칸 없음", (slug) => {
    const text = JSON.stringify(toolbox(CATALOGS[slug]!));
    ["independent", "dependent", "controlled"].forEach((r) => expect(text).toContain(`var_${slug}_${r}`));
    ["experimental_group", "comparison_group", "method"].forEach((r) => expect(text).not.toContain(`var_${slug}_${r}`));
    expect(JSON.stringify(variableBlocks(CATALOGS[slug]!))).not.toContain("WHY");
  });
});
