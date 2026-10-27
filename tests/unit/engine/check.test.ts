import { describe, expect, it } from "vitest";
import { checkCalc } from "@/lib/engine/grader/check";
import { densityPhysics } from "@/lib/engine/experiments/density/physics";
import type { CalcRequest, Measurement } from "@/lib/engine/types";

const request: CalcRequest = { key: "density.iron_big.t1", trial: 1, label: "밀도", unit: "g/mL", subject: "iron_big", inputs: ["mass.iron_big.t1", "volume.iron_big.t1"] };
const measurements: Measurement[] = [
  { key: "mass.iron_big.t1", trial: 1, label: "질량", value: 81.4, unit: "g", subject: "iron_big" },
  { key: "volume.iron_big.t1", trial: 1, label: "부피", value: 10.3, unit: "mL", subject: "iron_big" },
];
const check = (value: number, unit?: string) =>
  checkCalc({ request, measurements, value, unit, params: densityPhysics.sessionParams(null), rules: densityPhysics.answers });

describe("계산값 채점 — 밀도 (지침 5.3, FORMATIVE)", () => {
  it("정답(허용오차 안)", () => expect(check(7.9, "g/mL")).toMatchObject({ correct: true, errorType: null }));
  it("소수 둘째 자리 반올림 차도 정답", () => expect(check(7.91).correct).toBe(true));
  it("swapped: 부피÷질량", () => expect(check(10.3 / 81.4).errorType).toBe("swapped"));
  it("unit: 값은 맞고 단위가 다름", () => expect(check(7.9, "g").errorType).toBe("unit"));
  it("decimal: 10배", () => expect(check(79).errorType).toBe("decimal"));
  it("meniscus: 부피를 0.5 mL 잘못 읽음", () => expect(check(81.4 / 10.8).errorType).toBe("meniscus"));
  it("rounding: 근접하지만 허용오차 밖", () => expect(check(7.4).errorType).toBe("rounding"));
  it("not_number", () => expect(check(Number.NaN).errorType).toBe("not_number"));
  it("응답에 정답값 키가 없다", () => {
    const keys = Object.keys(check(5));
    expect(keys).not.toContain("expected");
    expect(keys).not.toContain("answer");
    expect(JSON.stringify(check(5))).not.toMatch(/7\.9/);
  });
  it("형성평가 표시", () => expect(check(7.9).assessment).toBe("FORMATIVE"));
});
