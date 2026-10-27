/**
 * 골든 테스트 (plan.md S1 수용 기준):
 * - 정상 경로 fixture의 측정값(노이즈 0)이 프로토타입 기대값과 일치
 * - 오류 경로 fixture에서 기대 code 포함
 * - dryRun()과 simulate()의 진단 code 집합이 같음
 */
import { describe, expect, it } from "vitest";
import { CATALOGS } from "@/lib/engine/experiments";
import { paramsForSeed } from "@/lib/engine/experiments/physicsRegistry";
import { dryRun, simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE } from "@/lib/engine/rng";
import { loadScenarios } from "./fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

for (const slug of Object.keys(CATALOGS)) {
  describe(`golden: ${slug}`, () => {
    const catalog = CATALOGS[slug];
    const src: PhysicsSource = { params: paramsForSeed(slug, null), rng: NO_NOISE, noisy: false };
    for (const sc of loadScenarios(slug)) {
      it(sc.name, () => {
        const result = simulate(sc.program, catalog, src);
        expect(result.ok).toBe(sc.expect.ok);
        Object.entries(sc.expect.measurements ?? {}).forEach(([key, value]) => {
          const m = result.measurements.find((x) => x.key === key);
          expect(m, `measurement ${key}`).toBeDefined();
          expect(m?.value).toBeCloseTo(value, 1);
        });
        if (sc.expect.calcKeys) expect(result.calcRequests.map((c) => c.key)).toEqual(sc.expect.calcKeys);
        if (sc.expect.codes) expect(codes(result.diagnostics)).toEqual([...sc.expect.codes].sort());
        Object.entries(sc.expect.series ?? {}).forEach(([key, plateau]) => {
          const s = result.series.find((x) => x.key === key);
          expect(s, `series ${key}`).toBeDefined();
          // 평탄 구간: 기대 온도 ±0.5 ℃ 안의 측정점이 3개 이상
          expect(s!.points.filter((p) => Math.abs(p.temp - plateau) <= 0.5).length).toBeGreaterThanOrEqual(3);
        });
      });
      it(`${sc.name} — dryRun 진단 = simulate 진단`, () => {
        expect(codes(dryRun(sc.program, catalog))).toEqual(codes(simulate(sc.program, catalog, src).diagnostics));
      });
    }
  });
}
