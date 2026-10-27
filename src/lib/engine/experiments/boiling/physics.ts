/**
 * 끓는점 측정 — 물성 수치(server-only). 프로토타입 LIQ(물 100 ℃, 에탄올 78 ℃)·ROOM 20 ℃를 기준으로,
 * 세션 seed로 실온·가열 세기와 끓는점(기압 차 수준, ±0.2 ℃)을 조금씩 바꾼다(평가 무결성).
 * textbookMode=false면 NIST 참조값(에탄올 78.4 ℃) — plan D14.
 */
import "server-only";
import type { Rng } from "../../rng";
import { jitter } from "../../rng";
import type { AnswerRule, PhysicsModule, PhysicsOptions } from "../physicsTypes";

const TEXTBOOK: Record<string, number> = { "water.bp": 100, "ethanol.bp": 78 };
const NIST: Record<string, number> = { "water.bp": 100, "ethanol.bp": 78.4 };

const BASE: Record<string, number> = {
  "room.temp": 20,
  /** 가열 세기 배율 — 1이면 프로토타입과 같은 빠르기 */
  "heat.rate": 1,
};

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

function sessionParams(rng: Rng | null, opts: PhysicsOptions = {}): Record<string, number> {
  const bps = opts.textbookMode === false ? NIST : TEXTBOOK;
  if (!rng) return { ...BASE, ...bps };
  const room = round1(20 + 2 * jitter(rng));
  const rate = round2(1 + 0.1 * jitter(rng));
  const shift = round1(0.2 * jitter(rng));
  return {
    ...BASE,
    "room.temp": room,
    "heat.rate": rate,
    "water.bp": round1(bps["water.bp"] + shift),
    "ethanol.bp": round1(bps["ethanol.bp"] + shift),
  };
}

const answers: AnswerRule[] = [
  {
    prefix: "bp.",
    family: "plateau",
    label: "끓는점",
    unit: "°C",
    tolerance: { abs: 1 },
    unitChoices: ["°C", "K", "℉"],
    fromParams: (subject, params) => params[`${subject}.bp`] ?? Number.NaN,
  },
];

export const boilingPhysics: PhysicsModule = { slug: "boiling", sessionParams, answers };
