"use client";
/**
 * 실행 단계 → 효과음. 화면 움직임(따르는 손 1.5초, 떨어지는 철조각 등)에 맞춰 재생 속도로 나눈 시각에 낸다.
 * 소리는 화면을 돕는 덤 — 소리가 없어도 실험 기록(글)과 장면으로 모두 알 수 있다(KWCAG 1.2, 1.4.2 끄기 단추).
 */
import type { Frame } from "@/lib/engine/types";
import { beep, boil, chime, click, clink, drips, plop, pour, powder, shake, stir } from "./effects";
import { stopAll } from "./synth";

type St = Record<string, unknown> & { heating?: boolean; bubbles?: number; vapour?: boolean };
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** 지금 무언가 끓어 액체가 모이는 중인가(끓는점 물중탕·증류) */
const collecting = (s: St) => Boolean(s.vapour) || (Boolean(obj(s.tube).hose) && (s.bubbles ?? 0) > 0.3) || Boolean(obj(s.flask).hose && s.heating && s.vapour);

/** 고체를 넣는 그릇에 액체가 있는가(밀도) */
function intoLiquid(s: St, container: unknown): boolean {
  if (container === "beaker") return Object.values(obj(obj(s.bkr).liquids)).some((v) => Number(v) > 0);
  return Number(obj(s.cyl).volume) > 0;
}

/** 가열 중인 단계 — 끓는 정도(bubbles)만큼 보글보글, 증류·물중탕이면 똑똑 */
function heatingSounds(s: St, step: number) {
  const strength = typeof s.bubbles === "number" ? s.bubbles : s.vapour ? 0.6 : 0.15;
  boil(0, step * 0.95, Math.min(1, strength));
  if (collecting(s)) drips(0.2, step * 0.9);
}

const ONE_SHOT: Record<string, (k: number, s: St, ev: Record<string, unknown>, step: number) => void> = {
  pour: (k) => pour(0.33 / k, 0.85 / k),
  transfer: (k) => pour(0.33 / k, 0.85 / k),
  addWater: (k) => pour(0.33 / k, 0.85 / k),
  filter: (k, _s, _e, step) => { pour(0.33 / k, 0.85 / k); drips(1.2 / k, step - 1.2 / k, 0.45); },
  zero: (k) => beep(0.55 / k),
  measureMass: (k) => beep(0.35 / k),
  weigh: (k) => beep(0.45 / k),
  dropSolid: (k, s, ev) => plop(0.75 / k, intoLiquid(s, ev.container)),
  scoop: (k) => powder(0.25 / k),
  add: (k) => { powder(0.15 / k, 0.35 / k); shake(0.6 / k, 0.9 / k); },
  repeat: (k) => { powder(0.1 / k, 0.3 / k); shake(0.5 / k, 1.1 / k); },
  addSolid: (k) => powder(0.2 / k),
  stir: (k) => stir(0.2 / k, 1.3 / k),
  bath: (k) => { clink(0.3 / k); clink(0.45 / k, 0.08); shake(0.6 / k, 0.5 / k); },
  cool: (k) => { clink(0.3 / k); clink(0.5 / k, 0.08); },
  chips: (k) => { clink(0.3 / k, 0.06); clink(0.42 / k, 0.05); clink(0.55 / k, 0.06); },
  heat: (k) => click(0.5 / k),
  stopHeat: (k) => click(0.4 / k),
  placeHot: (k) => clink(0.6 / k, 0.06),
  fixTube: (k) => click(0.6 / k),
  fixThermo: (k) => click(0.6 / k),
  stopper: (k) => click(0.5 / k),
  setup: (k) => click(0.5 / k),
  insertGlass: (k) => clink(0.5 / k, 0.06),
  insertEtube: (k) => clink(0.5 / k, 0.06),
  findBp: (k) => chime(0.3 / k),
  findPlateau: (k) => chime(0.3 / k),
  calc: (k) => chime(0.3 / k),
  record: (k) => chime(0.3 / k),
};

/** 이 단계의 소리를 낸다. step = 이 단계가 화면에 머무는 시간(초) */
export function playStep(frame: Frame | null, speed: number, step: number) {
  stopAll();
  if (!frame) return;
  const ev = frame.event as unknown as Record<string, unknown>;
  const s = obj(frame.state) as St;
  const type = String(ev.type ?? "");
  const one = ONE_SHOT[type];
  if (one) one(speed, s, ev, step);
  if (s.heating && !one) heatingSounds(s, step);
}

export { stopAll };
