/**
 * 재결정(혼합물 분리, separation2) — 골든·dryRun 일치·seed 결정성·석출량 채점.
 * 레지스트리 등록 전이므로 카탈로그·물성 모듈을 직접 불러 쓴다.
 */
import { describe, expect, it } from "vitest";
import { separation2Catalog } from "@/lib/engine/experiments/separation2/catalog";
import { separation2Physics } from "@/lib/engine/experiments/separation2/physics";
import { checkCalc } from "@/lib/engine/grader/check";
import { dryRun, physicsFromSeed, simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE, createRng } from "@/lib/engine/rng";
import type { Frame, Measurement } from "@/lib/engine/types";
import type { Separation2State } from "@/lib/engine/experiments/separation2/reducer";
import { loadScenarios } from "./fixtures";

const params = separation2Physics.sessionParams(null, { textbookMode: true });
const src: PhysicsSource = { params, rng: NO_NOISE, noisy: false };
const scenarios = loadScenarios("separation2");
const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();
const BANNED = /틀렸습니다|오답입니다|실패했습니다|맞지 않았|정답이 아니|오류입니다/;

describe("golden: separation2", () => {
  for (const sc of scenarios) {
    it(sc.name, () => {
      const result = simulate(sc.program, separation2Catalog, src);
      expect(result.ok).toBe(sc.expect.ok);
      Object.entries(sc.expect.measurements ?? {}).forEach(([key, value]) => {
        const m = result.measurements.find((x) => x.key === key);
        expect(m, `measurement ${key}`).toBeDefined();
        expect(m?.value).toBeCloseTo(value, 1);
      });
      if (sc.expect.calcKeys) expect(result.calcRequests.map((c) => c.key)).toEqual(sc.expect.calcKeys);
      if (sc.expect.codes) expect(codes(result.diagnostics)).toEqual([...sc.expect.codes].sort());
      result.diagnostics.forEach((d) => expect(d.message).not.toMatch(BANNED));
      result.frames.forEach((f) => expect(f.event.note).not.toMatch(BANNED));
    });
    it(`${sc.name} — dryRun 진단 = simulate 진단`, () => {
      expect(codes(dryRun(sc.program, separation2Catalog))).toEqual(codes(simulate(sc.program, separation2Catalog, src).diagnostics));
    });
  }
});

describe("separation2 물리: 10 °C까지 식히면 붕산 6.5 g 석출, 황산 구리(II)는 녹아 있음", () => {
  const normal = scenarios[0];
  const result = simulate(normal.program, separation2Catalog, src);
  const frames = result.frames as Frame<Separation2State>[];
  const filtered = frames.find((f) => f.event.type === "filter")!.state.filter;

  it("거름종이 위: 붕산 6.5 g, 황산 구리(II) 0 g", () => {
    expect(filtered.paper.boric_acid).toBeCloseTo(6.5, 2);
    expect(filtered.paper.cuso4).toBe(0);
  });
  it("걸러진 용액: 붕산 3.5 g + 황산 구리(II) 1 g이 녹아 있음(파란색)", () => {
    expect(filtered.fdis.boric_acid).toBeCloseTo(3.5, 2);
    expect(filtered.fdis.cuso4).toBeCloseTo(1, 2);
  });
  it("결과 확인 이벤트: 분리 성공", () => {
    expect(frames.find((f) => f.event.type === "check")!.event.ok).toBe(true);
  });
  it("황산 구리(II) 30 g이면 황산 구리(II)도 12.6 g 석출", () => {
    const cmp = simulate(scenarios[1].program, separation2Catalog, src).frames as Frame<Separation2State>[];
    const second = cmp.filter((f) => f.event.type === "filter")[1].state.filter;
    expect(second.paper.cuso4).toBeCloseTo(12.6, 2);
    expect(second.paper.boric_acid).toBeCloseTo(6.5, 2);
  });
});

describe("separation2 seed 결정성", () => {
  const sc = scenarios[1];
  const run = (seed: string) =>
    simulate(sc.program, separation2Catalog, physicsFromSeed(separation2Physics.sessionParams(createRng(`${seed}:params`)), seed));
  it("같은 seed → 깊은 동등", () => expect(run("student-A:sep2")).toEqual(run("student-A:sep2")));
  it("식힌 온도는 10±1 °C, 다른 seed면 측정값이 달라진다", () => {
    const temps = ["student-A:sep2", "student-B:sep2", "student-C:sep2"].map(
      (seed) => run(seed).measurements.find((m) => m.key === "temp.cold.t1")!.value,
    );
    temps.forEach((t) => expect(Math.abs(t - 10)).toBeLessThanOrEqual(1));
    expect(new Set(temps).size).toBeGreaterThan(1);
  });
});

describe("separation2 석출량 채점 (precipitate, FORMATIVE)", () => {
  const result = simulate(scenarios[0].program, separation2Catalog, src);
  const request = result.calcRequests[0];
  const measurements: Measurement[] = result.measurements;
  const check = (value: number, unit?: string) =>
    checkCalc({ request, measurements, value, unit, params, rules: separation2Physics.answers });

  it("계산 칸: 붕산, 입력은 넣은 양·물·식힌 온도", () => {
    expect(request).toMatchObject({ key: "precip.boric_acid.t1", unit: "g", subject: "boric_acid" });
    expect(request.inputs).toEqual(["added.boric_acid.t1", "water.t1", "temp.cold.t1"]);
  });
  it("정답: 10 − 3.5 = 6.5 g", () => expect(check(6.5, "g")).toMatchObject({ correct: true, errorType: null }));
  it("table_read: 20 °C 값으로 계산(10 − 4.7 = 5.3)", () => expect(check(5.3).errorType).toBe("table_read"));
  it("decimal: 10배", () => expect(check(65).errorType).toBe("decimal"));
  it("unit: 값은 맞고 단위가 g/물 100 g", () => expect(check(6.5, "g/물 100 g").errorType).toBe("unit"));
  it("응답에 정답값이 없다", () => expect(JSON.stringify(check(5.3))).not.toMatch(/6\.5/));
});
