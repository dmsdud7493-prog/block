/** 넣는 양 정해 주기(ADR-P26) — 교사가 고르면 정해 둔 양과 다르게 넣은 블록에서 실행 전에 멈춘다. 자유 배정에서는 그대로 */
import { describe, expect, it } from "vitest";
import { separation1Catalog } from "@/lib/engine/experiments/separation1/catalog";
import { separation2Catalog } from "@/lib/engine/experiments/separation2/catalog";
import { dryRun } from "@/lib/engine/simulator/run";
import { checkFixedAmounts, fixedAmountsText } from "@/lib/engine/rules/fixedAmounts";
import { E, Q, S, prog } from "./helpers";

const s2 = (water: number, boric: number) => prog("separation2", [S("a1", E("beaker"), E("hot_water"), Q(water, "g")), S("a1", E("beaker"), E("boric_acid"), Q(boric, "g")), S("a1", E("beaker"), E("cuso4"), Q(1, "g"))]);

describe("checkFixedAmounts", () => {
  it("용해도 차 분리: 정해 둔 양(물 100 g·붕산 10 g·황산 구리(II) 1 g)이면 문제없음", () => {
    expect(checkFixedAmounts(separation2Catalog, s2(100, 10).steps)).toEqual([]);
  });
  it("붕산을 15 g 넣으면 그 블록에 정해진 양을 알려 준다(정답 노출 없음 — 교사가 정한 실험 조건)", () => {
    const p = s2(100, 15);
    const d = checkFixedAmounts(separation2Catalog, p.steps);
    expect(d).toHaveLength(1);
    expect(d[0].blockId).toBe(p.steps[1].blockId);
    expect(d[0].message).toContain("붕산은 10 g만큼");
    expect(d[0].message).toContain("지금 15 g");
  });
  it("끓는점 차 분리: 물·에탄올 20 mL로 정해 준다", () => {
    const p = prog("separation1", [S("a1", E("flask"), E("water"), Q(20, "mL")), S("a1", E("flask"), E("ethanol"), Q(30, "mL"))]);
    expect(checkFixedAmounts(separation1Catalog, p.steps).map((d) => d.code)).toEqual(["fixed_amount"]);
    expect(fixedAmountsText(separation1Catalog)).toBe("물 20 mL · 에탄올 20 mL");
  });
  it("dryRun: 정해 주기 배정에서만 오류, 자유 배정에서는 그대로", () => {
    const p = s2(50, 15);
    expect(dryRun(p, separation2Catalog, { fixedAmounts: true }).filter((d) => d.code === "fixed_amount")).toHaveLength(2);
    expect(dryRun(p, separation2Catalog).filter((d) => d.code === "fixed_amount")).toHaveLength(0);
  });
});
