/**
 * 끓는점 차를 이용한 혼합물 분리 — 물성 수치(server-only).
 * 프로토타입 상수: 실온 20 ℃, 에탄올 평탄 구간 78.0 ℃ 시작·0.3 ℃ 상승(교육용 단순화), 물 끓는점 100 ℃.
 * textbookMode=false면 평탄 구간 시작을 78.4 ℃(참조값 78.37 ℃ 근처)로 둔다(plan D14).
 * 세션 seed로 가열 속도·처음 온도·평탄 구간 위치(±0.5 ℃ 이내)를 조금씩 바꾼다(평가 무결성).
 */
import "server-only";
import type { Rng } from "../../rng";
import { jitter } from "../../rng";
import type { AnswerRule, PhysicsModule, PhysicsOptions } from "../physicsTypes";

const r1 = (v: number): number => Math.round(v * 10) / 10;
const r3 = (v: number): number => Math.round(v * 1000) / 1000;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

function base(opts?: PhysicsOptions): Record<string, number> {
  const textbook = opts?.textbookMode ?? true;
  return {
    "room.temp": 20,
    "ethanol.plateau_start": textbook ? 78.0 : 78.4,
    "ethanol.plateau_rise": 0.3,
    "water.bp": 100,
    "heat.rate": 1,
    "collect.ethanol_frac": 0.9,
    "collect.water_frac": 0.05,
  };
}

function sessionParams(rng: Rng | null, opts?: PhysicsOptions): Record<string, number> {
  const b = base(opts);
  if (!rng) return b;
  const shift = clamp(r1(0.5 * jitter(rng)), -0.5, 0.5);
  return {
    ...b,
    "room.temp": r1(b["room.temp"] + 2 * jitter(rng)),
    "heat.rate": r3(1 + 0.1 * jitter(rng)),
    "ethanol.plateau_start": r1(b["ethanol.plateau_start"] + shift),
    "collect.ethanol_frac": r3(0.9 + 0.03 * jitter(rng)),
    "collect.water_frac": r3(0.05 + 0.01 * jitter(rng)),
  };
}

/**
 * 평탄 구간 온도의 기대값 = 구간의 가운데(start + rise/2).
 * 학생은 그래프의 거의 평평한 구간(start..start+rise)을 읽으므로 시작값·끝값 어느 쪽을 읽어도 허용오차 1 ℃ 안에 든다.
 */
const plateauOf = (_subject: string, params: Record<string, number>): number =>
  params["ethanol.plateau_start"] + params["ethanol.plateau_rise"] / 2;

const answers: AnswerRule[] = [
  {
    prefix: "dist.",
    family: "plateau",
    label: "처음 모인 액체가 끓어 나온 온도(평탄 구간)",
    unit: "°C",
    tolerance: { abs: 1 },
    unitChoices: ["°C", "K", "℉"],
    fromParams: plateauOf,
  },
];

export const separation1Physics: PhysicsModule = { slug: "separation1", sessionParams, answers };
