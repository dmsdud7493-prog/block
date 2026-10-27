/** 지침 2.1: 변인·집단·측정 블록 6종이 모든 실험 도구 상자에 있다 */
import { describe, expect, it } from "vitest";
import { VARIABLE_BLOCKS, variableBlockByRole } from "@/lib/engine/dsl/variableBlocks";
import { CATALOGS } from "@/lib/engine/experiments";
import { toolbox } from "@/lib/blocks/blockTypes";

const ROLES = ["independent", "dependent", "controlled", "experimental_group", "comparison_group", "method"] as const;

describe("변인 설계 블록 (지침 2.1)", () => {
  it("6종 역할이 하나씩 있다", () => {
    expect(VARIABLE_BLOCKS.map((b) => b.role).sort()).toEqual([...ROLES].sort());
    ROLES.forEach((r) => expect(variableBlockByRole(r)).toBeTruthy());
  });
  it.each(Object.keys(CATALOGS))("%s 도구 상자에 변인 블록 6종", (slug) => {
    const text = JSON.stringify(toolbox(CATALOGS[slug]!));
    ROLES.forEach((r) => expect(text).toContain(`var_${slug}_${r}`));
  });
});
