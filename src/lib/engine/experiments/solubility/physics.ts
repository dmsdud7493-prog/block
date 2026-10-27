/**
 * 용해도 측정 — 물성 수치(server-only). 프로토타입 SOLUTES(교과서 용해도 곡선, 물 100 g 기준)를 그대로 쓰고,
 * 세션 seed로 용해도를 ±2% 바꿔 학생마다 측정값이 조금씩 다르게 한다(평가 무결성).
 * 프로토타입에는 표가 하나뿐이라 textbookMode와 관계없이 같은 표를 쓴다(옵션은 계약상 받는다).
 */
import "server-only";
import type { Rng } from "../../rng";
import { jitter } from "../../rng";
import type { AnswerRule, PhysicsModule, PhysicsOptions } from "../physicsTypes";

/** g / 물 100 g (0 °C · 20 °C · 60 °C) */
const SOLUBILITY: Record<string, Record<number, number>> = {
  kno3: { 0: 13.3, 20: 31.6, 60: 109 },
  cuso4: { 0: 14.3, 20: 20.7, 60: 40 },
};

const BASE: Record<string, number> = {
  ...Object.fromEntries(
    Object.entries(SOLUBILITY).flatMap(([sub, table]) =>
      Object.entries(table).map(([t, v]) => [`${sub}.sol.${t}`, v] as const)),
  ),
  "paper.mass": 0.45,
};

/** opts(textbookMode)는 받되 표가 하나라 쓰지 않는다 */
function sessionParams(rng: Rng | null, ...rest: [PhysicsOptions?]): Record<string, number> {
  void rest;
  if (!rng) return { ...BASE };
  const varied = Object.fromEntries(
    Object.entries(BASE)
      .filter(([k]) => k.includes(".sol."))
      .map(([k, v]) => [k, Math.round(v * (1 + 0.02 * jitter(rng)) * 100) / 100] as const),
  );
  return { ...BASE, ...varied };
}

const answers: AnswerRule[] = [
  {
    prefix: "sol.",
    family: "per100",
    label: "물 100 g에 녹는 양",
    unit: "g/물 100 g",
    tolerance: { rel: 0.03, abs: 0.5 },
    unitChoices: ["g/물 100 g", "g", "g/mL"],
  },
];

export const solubilityPhysics: PhysicsModule = { slug: "solubility", sessionParams, answers };
