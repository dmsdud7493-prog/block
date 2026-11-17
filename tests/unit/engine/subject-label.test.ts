/** 표·그래프·보고서의 '대상' 이름은 모두 우리말 — 영어 내부 이름(mixture·solution …)이 보이지 않는다 (2026-11-17 점검) */
import { describe, expect, it } from "vitest";
import { CATALOGS } from "@/lib/engine/experiments";
import { paramsForSeed } from "@/lib/engine/experiments/physicsRegistry";
import { simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE } from "@/lib/engine/rng";
import { subjectLabel } from "@/lib/engine/subjectLabel";
import { loadScenarios } from "./fixtures";

describe("측정 대상 이름", () => {
  for (const slug of Object.keys(CATALOGS)) {
    it(`${slug}: 모든 정상 시나리오의 측정·계산·곡선 대상이 우리말 이름을 갖는다`, () => {
      const catalog = CATALOGS[slug];
      const src: PhysicsSource = { params: paramsForSeed(slug, null), rng: NO_NOISE, noisy: false };
      const subjects = new Set<string>();
      for (const sc of loadScenarios(slug).filter((s) => s.expect.ok)) {
        const r = simulate(sc.program, catalog, src);
        r.measurements.forEach((m) => subjects.add(m.subject));
        r.calcRequests.forEach((c) => subjects.add(c.subject));
        r.series.forEach((s) => subjects.add(s.subject));
      }
      for (const id of subjects) expect(subjectLabel(catalog, id), id).toMatch(/[가-힣]/);
    });
  }
});
