/**
 * 끓는점 측정 — 골든·결정성·채점 테스트 (프로토타입 boiling_point_lab.html 이식 검증).
 * 레지스트리에 등록하기 전이므로 카탈로그·물성 모듈을 직접 불러 쓴다.
 */
import { describe, expect, it } from "vitest";
import { boilingCatalog } from "@/lib/engine/experiments/boiling/catalog";
import { boilingPhysics } from "@/lib/engine/experiments/boiling/physics";
import { dryRun, physicsFromSeed, simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { createRng, NO_NOISE } from "@/lib/engine/rng";
import { checkCalc } from "@/lib/engine/grader/check";
import type { CalcRequest, Series, SimulationResult } from "@/lib/engine/types";
import { loadScenarios, type Scenario } from "./fixtures";

const FORBIDDEN = /틀렸습니다|오답입니다|실패했습니다|맞지 않았|정답이 아니|오류입니다/;
const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();
const scenarios = loadScenarios("boiling");
const byName = (part: string): Scenario => scenarios.find((s) => s.name.includes(part))!;
const goldenSrc = (textbookMode = true): PhysicsSource => ({
  params: boilingPhysics.sessionParams(null, { textbookMode }), rng: NO_NOISE, noisy: false,
});

/** 같은 key의 series 조각을 이어 붙인 전체 곡선 */
const curve = (r: SimulationResult, key: string) =>
  r.series.filter((s: Series) => s.key === key).flatMap((s) => s.points);

/** 끓기 시작한 뒤(최고 온도와 같은 값)의 평탄 구간 평균 */
function plateau(r: SimulationResult, key: string): number {
  const pts = curve(r, key);
  const tail = pts.slice(-6);
  return tail.reduce((a, p) => a + p.temp, 0) / tail.length;
}

describe("golden: boiling", () => {
  for (const sc of scenarios) {
    it(sc.name, () => {
      const result = simulate(sc.program, boilingCatalog, goldenSrc());
      expect(result.ok).toBe(sc.expect.ok);
      Object.entries(sc.expect.measurements ?? {}).forEach(([key, value]) => {
        const m = result.measurements.find((x) => x.key === key);
        expect(m, `measurement ${key}`).toBeDefined();
        expect(m?.value).toBeCloseTo(value, 1);
      });
      if (sc.expect.calcKeys) expect(result.calcRequests.map((c) => c.key)).toEqual(sc.expect.calcKeys);
      if (sc.expect.codes) expect(codes(result.diagnostics)).toEqual([...sc.expect.codes].sort());
      Object.entries(sc.expect.series ?? {}).forEach(([key, bp]) => {
        expect(curve(result, key).length, `series ${key}`).toBeGreaterThan(0);
        expect(Math.abs(plateau(result, key) - bp)).toBeLessThanOrEqual(0.5);
      });
      result.diagnostics.forEach((d) => expect(d.message).not.toMatch(FORBIDDEN));
      result.frames.forEach((f) => expect(f.event.note).not.toMatch(FORBIDDEN));
    });
    it(`${sc.name} — dryRun 진단 = simulate 진단`, () => {
      expect(codes(dryRun(sc.program, boilingCatalog))).toEqual(codes(simulate(sc.program, boilingCatalog, goldenSrc()).diagnostics));
    });
  }

  it("평탄 구간: 물 100±0.5 ℃, 에탄올 78±0.5 ℃ — 곡선은 실온에서 출발해 끓는점에서 멈춘다", () => {
    const water = simulate(byName("물 10 mL 직접").program, boilingCatalog, goldenSrc());
    const ethanol = simulate(byName("에탄올 10 mL 물중탕").program, boilingCatalog, goldenSrc());
    expect(Math.abs(plateau(water, "temp.water.t1") - 100)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(plateau(ethanol, "temp.ethanol.t1") - 78)).toBeLessThanOrEqual(0.5);
    const pts = curve(water, "temp.water.t1");
    expect(pts[0]).toEqual({ t: 0, temp: 20 });
    expect(Math.max(...pts.map((p) => p.temp))).toBe(100);
    expect(pts.map((p) => p.t)).toEqual([...pts.map((p) => p.t)].sort((a, b) => a - b));
  });

  it("그래프 블록이 끓는점 계산 칸을 만든다 (입력은 시간–온도 series)", () => {
    const r = simulate(byName("물 10 mL 직접").program, boilingCatalog, goldenSrc());
    expect(r.calcRequests[0]).toMatchObject({ key: "bp.water.t1", label: "끓는점", unit: "°C", subject: "water", inputs: ["temp.water.t1"] });
    expect(r.frames.at(-1)?.state).toEqual(boilingCatalog.initialState());
  });

  it("textbookMode 전환: 에탄올 78 ↔ 78.4 ℃", () => {
    const sc = byName("에탄올 10 mL 물중탕").program;
    expect(plateau(simulate(sc, boilingCatalog, goldenSrc(true)), "temp.ethanol.t1")).toBeCloseTo(78, 1);
    expect(plateau(simulate(sc, boilingCatalog, goldenSrc(false)), "temp.ethanol.t1")).toBeCloseTo(78.4, 1);
    expect(boilingPhysics.sessionParams(null, { textbookMode: false })["water.bp"]).toBe(100);
  });
});

describe("seed 결정성 — boiling (CLAUDE.md 규칙 3)", () => {
  const program = byName("물과 에탄올 비교").program;
  const run = (seed: string) =>
    simulate(program, boilingCatalog, physicsFromSeed(boilingPhysics.sessionParams(createRng(`${seed}:params`), { textbookMode: true }), seed));

  it("같은 seed → 깊은 동등", () => {
    expect(run("student-A:boiling")).toEqual(run("student-A:boiling"));
  });
  it("다른 seed → 곡선은 다르되 평탄 구간은 교과서 값 ±0.5 ℃ 안", () => {
    const a = run("student-A:boiling");
    const b = run("student-B:boiling");
    expect(a.series).not.toEqual(b.series);
    for (const r of [a, b]) {
      expect(Math.abs(plateau(r, "temp.water.t1") - 100)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(plateau(r, "temp.ethanol.t2") - 78)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe("계산값 채점 — 끓는점 (plateau, FORMATIVE)", () => {
  const request: CalcRequest = { key: "bp.ethanol.t1", trial: 1, label: "끓는점", unit: "°C", subject: "ethanol", inputs: ["temp.ethanol.t1"] };
  const check = (value: number, unit?: string) =>
    checkCalc({ request, measurements: [], value, unit, params: boilingPhysics.sessionParams(null, { textbookMode: true }), rules: boilingPhysics.answers });

  it("정답(±1 ℃)", () => {
    expect(check(78, "°C")).toMatchObject({ correct: true, errorType: null });
    expect(check(78.8).correct).toBe(true);
  });
  it("plateau: 평탄 구간이 아닌 온도를 읽음", () => expect(check(60, "°C").errorType).toBe("plateau"));
  it("unit: 켈빈으로 환산해 입력", () => expect(check(351.15, "K").errorType).toBe("unit"));
  it("unit: 값은 맞고 단위만 K", () => expect(check(78, "K").errorType).toBe("unit"));
  it("응답에 정답값이 없다", () => expect(JSON.stringify(check(60))).not.toMatch(/78/));
});
