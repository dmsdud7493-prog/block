/**
 * 밀도 측정 — 물성 수치(server-only). 프로토타입 MATERIALS 값을 그대로 쓰고,
 * 세션 seed로 시료 크기·액체 밀도를 조금씩 바꿔 학생마다 측정값이 다르게 한다(평가 무결성).
 */
import "server-only";
import type { Rng } from "../../rng";
import { jitter } from "../../rng";
import type { AnswerRule, PhysicsModule } from "../physicsTypes";

const BASE: Record<string, number> = {
  "water.density": 1.0,
  "oil.density": 0.92,
  "iron_big.mass": 79,
  "iron_big.volume": 10,
  "iron_small.mass": 39.5,
  "iron_small.volume": 5,
  "beaker.mass": 120,
  "cylinder.mass": 90,
};

function sessionParams(rng: Rng | null): Record<string, number> {
  if (!rng) return { ...BASE };
  const size = (base: number, f: number) => Math.round(base * f * 10) / 10;
  const fBig = 1 + 0.05 * jitter(rng);
  const fSmall = 1 + 0.05 * jitter(rng);
  const dWater = 1 + 0.004 * jitter(rng);
  const dOil = 1 + 0.004 * jitter(rng);
  return {
    ...BASE,
    "water.density": 1.0 * dWater,
    "oil.density": 0.92 * dOil,
    "iron_big.volume": size(10, fBig),
    "iron_big.mass": size(10, fBig) * 7.9,
    "iron_small.volume": size(5, fSmall),
    "iron_small.mass": size(5, fSmall) * 7.9,
  };
}

const answers: AnswerRule[] = [
  { prefix: "density.", family: "ratio", label: "밀도", unit: "g/mL", tolerance: { rel: 0.03, abs: 0.02 }, unitChoices: ["g/mL", "mL/g", "g"] },
];

export const densityPhysics: PhysicsModule = { slug: "density", sessionParams, answers };
