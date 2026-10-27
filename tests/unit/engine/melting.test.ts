/**
 * 녹는점 측정 — 골든·dryRun 일치·평탄 구간·TEXTBOOK_MODE·seed 결정성·채점 테스트.
 * (레지스트리 등록은 코디네이터가 하므로 카탈로그·물성을 직접 import한다)
 */
import { describe, expect, it } from "vitest";
import { meltingCatalog } from "@/lib/engine/experiments/melting/catalog";
import { meltingPhysics } from "@/lib/engine/experiments/melting/physics";
import { dryRun, physicsFromSeed, simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE, createRng } from "@/lib/engine/rng";
import { checkCalc } from "@/lib/engine/grader/check";
import type { CalcRequest, Measurement, SeriesPoint, SimulationResult } from "@/lib/engine/types";
import { loadScenarios } from "./fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();
const textbook = () => meltingPhysics.sessionParams(null, { textbookMode: true });
const src: PhysicsSource = { params: textbook(), rng: NO_NOISE, noisy: false };
const scenarios = loadScenarios("melting");
const FORBIDDEN = /틀렸습니다|오답입니다|실패했습니다|맞지 않았|정답이 아니|오류입니다/;

/** 같은 key의 series 구간을 이어 붙인다 (a7 + a8) */
function seriesPoints(result: SimulationResult, key: string): SeriesPoint[] {
  return result.series.filter((s) => s.key === key).flatMap((s) => s.points);
}

/** 녹기 시작 ~ 다 녹은 시각 사이 평탄 구간의 온도들 */
function plateau(result: SimulationResult, sub: string, trial: number): number[] {
  const m = (k: string) => result.measurements.find((x) => x.key === `${k}.${sub}.t${trial}`)?.value ?? Number.NaN;
  const [start, end] = [m("meltStart"), m("meltEnd")];
  return seriesPoints(result, `temp.${sub}.t${trial}`).filter((p) => p.t >= start && p.t < end).map((p) => p.temp);
}

const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe("golden: melting (프로토타입 fixture)", () => {
  for (const sc of scenarios) {
    it(sc.name, () => {
      const result = simulate(sc.program, meltingCatalog, src);
      expect(result.ok).toBe(sc.expect.ok);
      Object.entries(sc.expect.measurements ?? {}).forEach(([key, value]) => {
        const m = result.measurements.find((x) => x.key === key);
        expect(m, `measurement ${key}`).toBeDefined();
        expect(m?.value).toBeCloseTo(value, 1);
      });
      if (sc.expect.calcKeys) expect(result.calcRequests.map((c) => c.key)).toEqual(sc.expect.calcKeys);
      if (sc.expect.codes) expect(codes(result.diagnostics)).toEqual([...sc.expect.codes].sort());
      Object.entries(sc.expect.series ?? {}).forEach(([key, mp]) => {
        const [, sub, t] = key.split(".");
        const flat = plateau(result, sub, Number(t.slice(1)));
        expect(flat.length, `plateau of ${key}`).toBeGreaterThan(2);
        flat.forEach((temp) => expect(Math.abs(temp - mp)).toBeLessThanOrEqual(0.5));
      });
      result.diagnostics.forEach((d) => expect(d.message).not.toMatch(FORBIDDEN));
    });
    it(`${sc.name} — dryRun 진단 = simulate 진단`, () => {
      expect(codes(dryRun(sc.program, meltingCatalog))).toEqual(codes(simulate(sc.program, meltingCatalog, src).diagnostics));
    });
  }
});

describe("시간–온도 곡선", () => {
  const lauric = simulate(scenarios[0].program, meltingCatalog, src);
  const palmitic = simulate(scenarios[1].program, meltingCatalog, src);
  it("로르산 평탄 구간 44 ℃, 팔미트산 63 ℃", () => {
    expect(median(plateau(lauric, "lauric_acid", 1))).toBeCloseTo(44, 1);
    expect(median(plateau(palmitic, "palmitic_acid", 1))).toBeCloseTo(63, 1);
  });
  it("30초 간격, 오르다가 → 평평 → 다시 오름 (다 녹은 뒤 1분 = 2점 더)", () => {
    const pts = seriesPoints(lauric, "temp.lauric_acid.t1");
    expect(pts.map((p) => p.t).every((t) => t % 30 === 0)).toBe(true);
    expect(pts[0].temp).toBeCloseTo(20, 1);
    expect(pts[pts.length - 1].t).toBe(390 + 60);
    expect(pts[pts.length - 1].temp).toBeGreaterThan(44);
    expect(pts[3].temp).toBeLessThan(44);
  });
  it("그래프 블록은 녹는점 CalcRequest(입력=series key)를 낸다 — 이벤트에 녹는점 값 없음", () => {
    const req = lauric.calcRequests[0];
    expect(req).toMatchObject({ key: "mp.lauric_acid.t1", label: "녹는점", unit: "°C", inputs: ["temp.lauric_acid.t1"] });
    const findMp = lauric.frames.find((f) => f.event.type === "findMp");
    expect(findMp?.event).not.toHaveProperty("mp");
  });
});

describe("TEXTBOOK_MODE 전환 (plan D14)", () => {
  it("교과서 44/63 ↔ NIST 43.9/61.9", () => {
    expect(meltingPhysics.sessionParams(null, { textbookMode: true })).toMatchObject({ "lauric_acid.mp": 44, "palmitic_acid.mp": 63 });
    expect(meltingPhysics.sessionParams(null, { textbookMode: false })).toMatchObject({ "lauric_acid.mp": 43.9, "palmitic_acid.mp": 61.9 });
  });
  it("NIST 모드 시뮬레이션의 평탄 구간은 43.9 ℃", () => {
    const nist: PhysicsSource = { params: meltingPhysics.sessionParams(null, { textbookMode: false }), rng: NO_NOISE, noisy: false };
    expect(median(plateau(simulate(scenarios[0].program, meltingCatalog, nist), "lauric_acid", 1))).toBeCloseTo(43.9, 1);
  });
});

describe("seed 결정성", () => {
  const run = (seed: string) =>
    simulate(scenarios[0].program, meltingCatalog, physicsFromSeed(meltingPhysics.sessionParams(createRng(`${seed}:params`), { textbookMode: true }), seed));
  it("같은 seed → 깊은 동등", () => expect(run("student-A:melting")).toEqual(run("student-A:melting")));
  it("다른 seed → 기록은 다르되 평탄 구간 중심은 44 ℃ ±0.5 안", () => {
    const [a, b] = [run("student-A:melting"), run("student-B:melting")];
    expect(seriesPoints(a, "temp.lauric_acid.t1")).not.toEqual(seriesPoints(b, "temp.lauric_acid.t1"));
    const centres = [a, b].map((r) => median(plateau(r, "lauric_acid", 1)));
    centres.forEach((c) => expect(Math.abs(c - 44)).toBeLessThanOrEqual(0.5));
    expect(Math.abs(centres[0] - centres[1])).toBeLessThanOrEqual(1);
  });
  it("세션 물성의 녹는점 흔들림은 ±0.5 ℃로 제한", () => {
    ["s1", "s2", "s3", "s4", "s5"].forEach((seed) => {
      const p = meltingPhysics.sessionParams(createRng(`${seed}:params`), { textbookMode: true });
      expect(Math.abs(p["lauric_acid.mp"] - 44)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(p["palmitic_acid.mp"] - 63)).toBeLessThanOrEqual(0.5);
    });
  });
});

describe("계산값 채점 — 녹는점 (plateau, FORMATIVE)", () => {
  const request: CalcRequest = { key: "mp.lauric_acid.t1", trial: 1, label: "녹는점", unit: "°C", subject: "lauric_acid", inputs: ["temp.lauric_acid.t1"] };
  const measurements: Measurement[] = [];
  const check = (value: number, unit?: string) =>
    checkCalc({ request, measurements, value, unit, params: textbook(), rules: meltingPhysics.answers });
  it("정답(±1 ℃)", () => {
    expect(check(44, "°C")).toMatchObject({ correct: true, errorType: null });
    expect(check(44.8).correct).toBe(true);
  });
  it("plateau: 오르는 구간의 온도를 읽음", () => expect(check(35, "°C").errorType).toBe("plateau"));
  it("unit: 켈빈 값을 입력", () => expect(check(317.15, "°C").errorType).toBe("unit"));
  it("unit: 값은 맞고 단위를 K로 고름", () => expect(check(44, "K").errorType).toBe("unit"));
  it("팔미트산은 63 ℃ 기준", () => {
    const r = checkCalc({ request: { ...request, key: "mp.palmitic_acid.t1", subject: "palmitic_acid" }, measurements, value: 63, unit: "°C", params: textbook(), rules: meltingPhysics.answers });
    expect(r.correct).toBe(true);
  });
  it("응답에 정답값이 없다", () => expect(JSON.stringify(check(30))).not.toMatch(/44/));
});
