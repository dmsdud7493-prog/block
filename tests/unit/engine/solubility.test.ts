/**
 * 용해도 측정 — 골든·결정성·계산값 채점 테스트 (프로토타입 solubility-lab.html 기준값).
 * 레지스트리 등록 전이라 카탈로그·물성을 직접 import 한다.
 */
import { describe, expect, it } from "vitest";
import { solubilityCatalog } from "@/lib/engine/experiments/solubility/catalog";
import { solubilityPhysics } from "@/lib/engine/experiments/solubility/physics";
import { dryRun, physicsFromSeed, simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE, createRng } from "@/lib/engine/rng";
import { checkCalc } from "@/lib/engine/grader/check";
import type { CalcRequest, Measurement } from "@/lib/engine/types";
import { loadScenarios } from "./fixtures";
import { E, Q, S, prog } from "./helpers";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();
const src: PhysicsSource = { params: solubilityPhysics.sessionParams(null, { textbookMode: true }), rng: NO_NOISE, noisy: false };
const scenarios = loadScenarios("solubility");

describe("golden: solubility", () => {
  for (const sc of scenarios) {
    it(sc.name, () => {
      const result = simulate(sc.program, solubilityCatalog, src);
      expect(result.ok).toBe(sc.expect.ok);
      Object.entries(sc.expect.measurements ?? {}).forEach(([key, value]) => {
        const m = result.measurements.find((x) => x.key === key);
        expect(m, `measurement ${key}`).toBeDefined();
        expect(m?.value).toBeCloseTo(value, 2);
      });
      if (sc.expect.calcKeys) expect(result.calcRequests.map((c) => c.key)).toEqual(sc.expect.calcKeys);
      if (sc.expect.codes) expect(codes(result.diagnostics)).toEqual([...sc.expect.codes].sort());
    });
    it(`${sc.name} — dryRun 진단 = simulate 진단`, () => {
      expect(codes(dryRun(sc.program, solubilityCatalog))).toEqual(codes(simulate(sc.program, solubilityCatalog, src).diagnostics));
    });
  }

  it("물 10 g·20 °C에서 녹는 양이 프로토타입 용해도(31.6, 20.7 g/물 100 g)의 1/10", () => {
    const sc = scenarios.find((s) => s.name.includes("실험1 전체"))!;
    const ms = simulate(sc.program, solubilityCatalog, src).measurements;
    expect(ms.find((m) => m.key === "dissolved.kno3.t1")?.value).toBeCloseTo(3.16, 2);
    expect(ms.find((m) => m.key === "dissolved.cuso4.t2")?.value).toBeCloseTo(2.07, 2);
  });

  it("계산 요청은 녹은 양·물의 질량을 입력으로 쓴다", () => {
    const sc = scenarios[0];
    const req = simulate(sc.program, solubilityCatalog, src).calcRequests[0];
    expect(req).toMatchObject({ label: "물 100 g에 녹는 양", unit: "g/물 100 g", inputs: ["dissolved.kno3.t1", "water.kno3.t1"] });
  });

  it("실험2: 얼음물에서 결정이 생긴다", () => {
    const sc = scenarios.find((s) => s.name.includes("실험2"))!;
    const frames = simulate(sc.program, solubilityCatalog, src).frames;
    expect(frames[frames.length - 1].event).toMatchObject({ type: "bath", crystal: true });
  });

  it("포화 전 총량 기록은 실행에서만 잡힌다(물성 필요) — record_not_saturated", () => {
    const p = prog("solubility", [
      S("a1", E("tube_a"), E("water"), Q(10, "g")), S("a2", E("scale"), E("weighing_paper")),
      S("a3", E("kno3"), Q(1, "g"), E("spatula")), S("a4", E("kno3"), E("tube_a")), S("a6", E("kno3")),
    ]);
    expect(codes(simulate(p, solubilityCatalog, src).diagnostics)).toEqual(["record_not_saturated"]);
    expect(codes(dryRun(p, solubilityCatalog))).toEqual([]);
  });

  it("오류 문구에 금지 표현이 없다", () => {
    const banned = /틀렸습니다|오답입니다|실패했습니다|맞지 않았|정답이 아니|오류입니다/;
    scenarios.forEach((sc) => simulate(sc.program, solubilityCatalog, src).diagnostics.forEach((d) => expect(d.message).not.toMatch(banned)));
  });
});

describe("seed 결정성: solubility", () => {
  const sc = scenarios.find((s) => s.name.includes("실험1 전체"))!;
  const run = (seed: string) =>
    simulate(sc.program, solubilityCatalog, physicsFromSeed(solubilityPhysics.sessionParams(createRng(`${seed}:params`), { textbookMode: true }), seed));
  it("같은 seed → 깊은 동등", () => expect(run("student-A:sol")).toEqual(run("student-A:sol")));
  it("다른 seed → 값은 다르되 용해도는 기준값 ±3% 안", () => {
    const a = run("student-A:sol").measurements;
    const b = run("student-B:sol").measurements;
    expect(a.map((m) => m.value)).not.toEqual(b.map((m) => m.value));
    for (const ms of [a, b]) {
      const kno3 = ms.find((m) => m.key === "dissolved.kno3.t1")!.value;
      expect(Math.abs(kno3 * 10 - 31.6) / 31.6).toBeLessThan(0.03);
    }
  });
});

describe("계산값 채점 — 용해도 (per100, FORMATIVE)", () => {
  const request: CalcRequest = { key: "sol.kno3.t1", trial: 1, label: "물 100 g에 녹는 양", unit: "g/물 100 g", subject: "kno3", inputs: ["dissolved.kno3.t1", "water.kno3.t1"] };
  const measurements: Measurement[] = [
    { key: "dissolved.kno3.t1", trial: 1, label: "녹은 양", value: 3.16, unit: "g", subject: "kno3" },
    { key: "water.kno3.t1", trial: 1, label: "물의 질량", value: 10, unit: "g", subject: "kno3" },
  ];
  const check = (value: number, unit?: string) =>
    checkCalc({ request, measurements, value, unit, params: solubilityPhysics.sessionParams(null, { textbookMode: true }), rules: solubilityPhysics.answers });
  it("정답", () => expect(check(31.6, "g/물 100 g")).toMatchObject({ correct: true, errorType: null }));
  it("solvent_basis: 물 10 g 기준 값을 그대로 입력", () => expect(check(3.16).errorType).toBe("solvent_basis"));
  it("decimal: 10배", () => expect(check(316).errorType).toBe("decimal"));
  it("unit: 값은 맞고 단위가 g", () => expect(check(31.6, "g").errorType).toBe("unit"));
});
