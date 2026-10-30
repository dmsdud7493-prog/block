/** 밀도: 네 가지 물질을 한 비커에 — 밀도 순서로 자리 잡고, 미션 ③ 완료 신호(settled)를 낸다 */
import { describe, expect, it } from "vitest";
import { densityCatalog } from "@/lib/engine/experiments/density/catalog";
import { densityPhysics } from "@/lib/engine/experiments/density/physics";
import { dryRun, simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE } from "@/lib/engine/rng";
import { E, Q, S, prog } from "./helpers";

const src: PhysicsSource = { params: densityPhysics.sessionParams(null, { textbookMode: true }), rng: NO_NOISE, noisy: false };
const four = () => prog("density", [
  S("a6", E("beaker"), E("oil"), Q(50, "mL")),
  S("a6", E("beaker"), E("water"), Q(50, "mL")),
  S("a7", E("iron_small"), E("beaker")),
  S("a7", E("iron_big"), E("beaker")),
]);

describe("density: 한 비커에 넣기", () => {
  it("식용유 위에 물을 부어도 밀도 순서로 자리 잡는다(아래부터 철조각 → 물 → 식용유)", () => {
    const r = simulate(four(), densityCatalog, src);
    expect(r.ok).toBe(true);
    const last = r.frames[r.frames.length - 1];
    const settled = last.event.settled as string[];
    expect(settled.slice(0, 2).sort()).toEqual(["iron_big", "iron_small"]);
    expect(settled.slice(2)).toEqual(["water", "oil"]);
    expect(last.event.note).toContain("아래부터");
  });

  it("dryRun(물성 없음)에서도 오류 없이 지나간다", () => {
    expect(dryRun(four(), densityCatalog).filter((d) => d.severity === "error")).toEqual([]);
  });

  it("섞인 비커에서는 한 액체만의 질량을 잴 수 없다", () => {
    const p = prog("density", [
      S("a1", E("beaker"), E("scale")),
      S("a6", E("beaker"), E("water"), Q(50, "mL")),
      S("a6", E("beaker"), E("oil"), Q(30, "mL")),
      S("a4", E("water")),
    ]);
    const r = simulate(p, densityCatalog, src);
    expect(r.diagnostics.map((d) => d.code)).toContain("mass_mixed");
  });

  it("눈금실린더에서는 여전히 액체를 섞지 않는다", () => {
    const p = prog("density", [S("a2", E("water"), Q(30, "mL")), S("a2", E("oil"), Q(30, "mL"))]);
    expect(simulate(p, densityCatalog, src).diagnostics.map((d) => d.code)).toContain("liquid_mix");
  });
});
