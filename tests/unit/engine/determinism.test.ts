import { describe, expect, it } from "vitest";
import { densityCatalog } from "@/lib/engine/experiments/density/catalog";
import { paramsForSeed } from "@/lib/engine/experiments/physicsRegistry";
import { physicsFromSeed, simulate } from "@/lib/engine/simulator/run";
import { VARIABLE_BLOCKS } from "@/lib/engine/dsl/variableBlocks";
import { loadScenarios } from "./fixtures";

const ironScenario = loadScenarios("density").find((s) => s.name.includes("철조각"))!;
const run = (seed: string) => simulate(ironScenario.program, densityCatalog, physicsFromSeed(paramsForSeed("density", seed), seed));

describe("seed 결정성 (CLAUDE.md 규칙 3)", () => {
  it("같은 seed → 깊은 동등", () => {
    expect(run("student-A:density")).toEqual(run("student-A:density"));
  });
  it("다른 seed → 측정값은 다르되 밀도는 7.9±3% 안", () => {
    const a = run("student-A:density").measurements;
    const b = run("student-B:density").measurements;
    expect(a.map((m) => m.value)).not.toEqual(b.map((m) => m.value));
    for (const ms of [a, b]) {
      for (const subject of ["iron_big", "iron_small"]) {
        const mass = ms.find((m) => m.subject === subject && m.label === "질량")!.value;
        const vol = ms.find((m) => m.subject === subject && m.label === "부피")!.value;
        expect(Math.abs(mass / vol - 7.9) / 7.9).toBeLessThan(0.03);
      }
    }
  });
});

describe("변인 설계 블록 (지침 2.1)", () => {
  it("6종이 존재한다", () => {
    expect(VARIABLE_BLOCKS.map((b) => b.role).sort()).toEqual(
      ["comparison_group", "controlled", "dependent", "experimental_group", "independent", "method"],
    );
  });
});
