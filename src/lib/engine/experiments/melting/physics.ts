/**
 * 녹는점 측정 — 물성 수치(server-only). 프로토타입 SUB(로르산 44 ℃, 팔미트산 63 ℃)와 가열 곡선 상수를 쓰고,
 * TEXTBOOK_MODE=false면 NIST 참조값(43.9 / 61.9 ℃, plan D14)을 쓴다.
 * 세션 seed로 실온·시료 질량·평탄 구간 온도(±0.5 ℃ 이내)를 조금씩 바꿔 학생마다 기록이 다르게 한다.
 */
import "server-only";
import type { Rng } from "../../rng";
import { jitter } from "../../rng";
import type { AnswerRule, PhysicsModule, PhysicsOptions } from "../physicsTypes";

const MP_TEXTBOOK: Record<string, number> = { lauric_acid: 44, palmitic_acid: 63 };
const MP_NIST: Record<string, number> = { lauric_acid: 43.9, palmitic_acid: 61.9 };

/** 평탄 구간 중심의 세션별 흔들림 상한 (℃) */
export const MP_JITTER_MAX = 0.5;

const CURVE: Record<string, number> = {
  "room.temp": 20,
  "sample.massFactor": 1,
  "heat.secPerDeg": 5,
  "heat.secPerGram": 12,
  "heat.curve": 1.6,
  "melt.baseSec": 60,
  "melt.secPerGram": 30,
  "after.rise": 22,
  "after.tauSec": 150,
};

const clamp = (v: number, lim: number): number => Math.max(-lim, Math.min(lim, v));
const r2 = (v: number): number => Math.round(v * 100) / 100;

function baseParams(textbookMode: boolean): Record<string, number> {
  const mp = textbookMode ? MP_TEXTBOOK : MP_NIST;
  return {
    ...CURVE,
    "lauric_acid.mp": mp.lauric_acid,
    "palmitic_acid.mp": mp.palmitic_acid,
  };
}

function sessionParams(rng: Rng | null, opts: PhysicsOptions = {}): Record<string, number> {
  const base = baseParams(opts.textbookMode !== false);
  if (!rng) return base;
  const dLauric = clamp(0.3 * jitter(rng), MP_JITTER_MAX);
  const dPalmitic = clamp(0.3 * jitter(rng), MP_JITTER_MAX);
  return {
    ...base,
    "room.temp": r2(20 + 1.5 * jitter(rng)),
    "sample.massFactor": r2(1 + 0.03 * jitter(rng)),
    "lauric_acid.mp": r2(base["lauric_acid.mp"] + dLauric),
    "palmitic_acid.mp": r2(base["palmitic_acid.mp"] + dPalmitic),
  };
}

const answers: AnswerRule[] = [
  {
    prefix: "mp.",
    family: "plateau",
    label: "녹는점",
    unit: "°C",
    tolerance: { abs: 1 },
    unitChoices: ["°C", "K", "℉"],
    fromParams: (subject, params) => params[`${subject}.mp`] ?? Number.NaN,
  },
];

export const meltingPhysics: PhysicsModule = { slug: "melting", sessionParams, answers };
