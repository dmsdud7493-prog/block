/**
 * 끓는점 차를 이용한 혼합물 분리(separation1) — 골든·dryRun 일치·평탄 구간·결정성·채점.
 * (레지스트리 등록 전이므로 카탈로그·물성을 직접 import 한다)
 */
import { describe, expect, it } from "vitest";
import { separation1Catalog } from "@/lib/engine/experiments/separation1/catalog";
import { separation1Physics } from "@/lib/engine/experiments/separation1/physics";
import { dryRun, physicsFromSeed, simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { createRng, NO_NOISE } from "@/lib/engine/rng";
import { checkCalc } from "@/lib/engine/grader/check";
import type { CalcRequest, Measurement, SeriesPoint } from "@/lib/engine/types";
import { loadScenarios } from "./fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();
const params = separation1Physics.sessionParams(null, { textbookMode: true });
const src: PhysicsSource = { params, rng: NO_NOISE, noisy: false };
const scenarios = loadScenarios("separation1");
const normal = scenarios[0];

describe("golden: separation1", () => {
  for (const sc of scenarios) {
    it(sc.name, () => {
      const result = simulate(sc.program, separation1Catalog, src);
      expect(result.ok).toBe(sc.expect.ok);
      Object.entries(sc.expect.measurements ?? {}).forEach(([key, value]) => {
        const m = result.measurements.find((x) => x.key === key);
        expect(m, `measurement ${key}`).toBeDefined();
        expect(m?.value).toBeCloseTo(value, 1);
      });
      if (sc.expect.calcKeys) expect(result.calcRequests.map((c) => c.key)).toEqual(sc.expect.calcKeys);
      if (sc.expect.codes) expect(codes(result.diagnostics)).toEqual([...sc.expect.codes].sort());
      Object.keys(sc.expect.series ?? {}).forEach((key) => {
        expect(result.series.find((x) => x.key === key), `series ${key}`).toBeDefined();
      });
    });
    it(`${sc.name} — dryRun 진단 = simulate 진단`, () => {
      expect(codes(dryRun(sc.program, separation1Catalog))).toEqual(codes(simulate(sc.program, separation1Catalog, src).diagnostics));
    });
  }
});

/** 78.0~78.3 ℃ 사이에 머무는 가장 긴 연속 구간 */
function longestFlat(points: SeriesPoint[]): { from: number; to: number } {
  return points.reduce(
    (acc, p, i) => {
      const inBand = p.temp >= 78 - 1e-9 && p.temp <= 78.3 + 1e-9;
      const start = inBand ? (acc.cur < 0 ? i : acc.cur) : -1;
      const best = start >= 0 && i - start > acc.best.to - acc.best.from ? { from: start, to: i } : acc.best;
      return { cur: start, best };
    },
    { cur: -1, best: { from: 0, to: -1 } },
  ).best;
}

describe("온도 모델: 상승 → 평탄(78.0~78.3 ℃) → 다시 상승", () => {
  const result = simulate(normal.program, separation1Catalog, src);
  const series = result.series.find((s) => s.key === "temp.mixture.t1");

  it("평탄 구간이 있고 그 뒤 온도가 다시 오른다", () => {
    expect(series).toBeDefined();
    const pts = series?.points ?? [];
    const flat = longestFlat(pts);
    expect(flat.to - flat.from).toBeGreaterThanOrEqual(10);
    expect(pts[0].temp).toBeLessThan(78);
    const after = pts.slice(flat.to + 1);
    expect(after.length).toBeGreaterThan(0);
    expect(after[after.length - 1].temp).toBeGreaterThan(80);
  });

  it("온도는 내려가지 않는다(단조 증가)", () => {
    const pts = series?.points ?? [];
    pts.slice(1).forEach((p, i) => expect(p.temp).toBeGreaterThanOrEqual(pts[i].temp));
  });

  it("그래프 블록이 평탄 구간 계산 칸을 요청한다", () => {
    const req = result.calcRequests[0];
    expect(req).toMatchObject({ key: "dist.ethanol.t1", unit: "°C", subject: "ethanol", inputs: ["temp.mixture.t1"] });
  });
});

describe("textbookMode 스위치", () => {
  it("교과서 78.0 ℃ / 참조 78.4 ℃", () => {
    expect(separation1Physics.sessionParams(null, { textbookMode: true })["ethanol.plateau_start"]).toBe(78.0);
    expect(separation1Physics.sessionParams(null, { textbookMode: false })["ethanol.plateau_start"]).toBe(78.4);
  });
  it("seed 변동은 ±0.5 ℃ 이내", () => {
    ["a", "b", "c", "d", "e"].forEach((seed) => {
      const p = separation1Physics.sessionParams(createRng(seed), { textbookMode: true });
      expect(Math.abs(p["ethanol.plateau_start"] - 78)).toBeLessThanOrEqual(0.5 + 1e-9);
    });
  });
});

describe("seed 결정성", () => {
  const run = (seed: string) =>
    simulate(normal.program, separation1Catalog, physicsFromSeed(separation1Physics.sessionParams(createRng(`${seed}:params`)), seed));
  it("같은 seed → 깊은 동등", () => expect(run("student-A:separation1")).toEqual(run("student-A:separation1")));
  it("다른 seed → 측정 기록이 다르다", () => {
    expect(run("student-A:separation1").series).not.toEqual(run("student-B:separation1").series);
  });
});

describe("계산값 채점 — 평탄 구간 온도 (FORMATIVE)", () => {
  const request: CalcRequest = { key: "dist.ethanol.t1", trial: 1, label: "처음 모인 액체가 끓어 나온 온도(평탄 구간)", unit: "°C", subject: "ethanol", inputs: ["temp.mixture.t1"] };
  const measurements: Measurement[] = [];
  const check = (value: number, unit?: string) =>
    checkCalc({ request, measurements, value, unit, params, rules: separation1Physics.answers });

  it("정답(78.1 ℃)", () => expect(check(78.1, "°C")).toMatchObject({ correct: true, errorType: null }));
  it("78 ℃로 읽어도 허용오차 안", () => expect(check(78).correct).toBe(true));
  it("plateau: 물의 끓는점(100 ℃)을 적음", () => expect(check(100, "°C").errorType).toBe("plateau"));
  it("unit: 값은 맞고 단위가 K", () => expect(check(78.2, "K").errorType).toBe("unit"));
  it("unit: 켈빈으로 환산한 값", () => expect(check(351.3, "°C").errorType).toBe("unit"));
  it("응답에 정답값이 없다", () => expect(JSON.stringify(check(50))).not.toMatch(/78/));
});
