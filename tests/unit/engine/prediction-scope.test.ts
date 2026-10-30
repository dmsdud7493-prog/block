/** 블록에 쓰인 물질에 맞는 예측을 묻는다 (지침 3.1) */
import { describe, expect, it } from "vitest";
import { densityCatalog } from "@/lib/engine/experiments/density/catalog";
import { meltingCatalog } from "@/lib/engine/experiments/melting/catalog";
import { graphTargets, runTarget } from "@/lib/engine/predictionScope";
import { E, Q, S, prog } from "./helpers";

const liquids = prog("density", [S("a2", E("water"), Q(50, "mL")), S("a2", E("oil"), Q(50, "mL"))]);
const irons = prog("density", [S("a4", E("iron_big")), S("a4", E("iron_small"))]);
const all = prog("density", [S("a6", E("beaker"), E("water"), Q(50, "mL")), S("a6", E("beaker"), E("oil"), Q(50, "mL")), S("a7", E("iron_big"), E("beaker")), S("a7", E("iron_small"), E("beaker"))]);

describe("예측 범위", () => {
  it("물·식용유만 다루면 물·식용유 예측을 묻고, 철조각 예측은 묻지 않는다", () => {
    expect(runTarget(densityCatalog, liquids)).toBe("oil_water");
    expect(graphTargets(densityCatalog, liquids)).toEqual(["oil_water"]);
  });
  it("철조각만 다루면 철조각 밀도 예측", () => {
    expect(runTarget(densityCatalog, irons)).toBe("same_density");
    expect(graphTargets(densityCatalog, irons)).toEqual(["same_density"]);
  });
  it("넷을 한 비커에 넣으면 비커 속 순서 예측을 먼저, 그래프 전에는 셋 다", () => {
    expect(runTarget(densityCatalog, all)).toBe("float_sink");
    expect(graphTargets(densityCatalog, all)).toEqual(["oil_water", "same_density", "float_sink"]);
  });
  it("철조각 부피를 재려고 물을 부어도 철조각 예측을 묻는다", () => {
    const ironWithWater = prog("density", [S("a4", E("iron_big")), S("a2", E("water"), Q(50, "mL")), S("a7", E("iron_big"), E("cylinder")), S("a4", E("iron_small"))]);
    expect(runTarget(densityCatalog, ironWithWater)).toBe("same_density");
    expect(graphTargets(densityCatalog, ironWithWater)).toEqual(["same_density"]);
  });
  it("블록이 비어 있으면 첫 예측", () => {
    expect(runTarget(densityCatalog, prog("density", []))).toBe("oil_water");
  });
  it("subjects가 없는 실험은 예전처럼(첫 예측, 그래프 전 전부)", () => {
    expect(runTarget(meltingCatalog, prog("melting", []))).toBe(meltingCatalog.predictionTargets[0].id);
    expect(graphTargets(meltingCatalog, prog("melting", []))).toEqual(meltingCatalog.predictionTargets.map((t) => t.id));
  });
});
