"use client";
/**
 * 실험 효과음 — synth의 기본음을 엮어 '쪼로록'·'보글보글'·'퐁'·'똑똑'·'삑' 같은 소리를 만든다.
 * at·dur는 초 단위(재생 속도를 반영해 넘겨받는다).
 */
import { hiss, tone } from "./synth";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** 물 따르기 — 물줄기 소리(걸러진 잡음, 차오를수록 음이 높아짐) + 꼴록거리는 작은 방울 소리 */
export function pour(at: number, dur: number) {
  const curve = Array.from({ length: 24 }, (_, i) => (i === 0 || i === 23 ? 0 : 0.7 + Math.random() * 0.3));
  hiss(at, dur, { type: "bandpass", f0: 550, f1: 1500, q: 1.4, vol: 0.5, curve });
  for (let t = 0.05; t < dur - 0.05; t += rnd(0.06, 0.13)) tone(at + t, rnd(500, 900), rnd(900, 1500), rnd(0.03, 0.06), 0.06);
}

/** 보글보글 — strength(0~1)가 클수록 방울이 많고 굵다 */
export function boil(at: number, dur: number, strength: number) {
  if (strength <= 0.05 || dur <= 0) return;
  hiss(at, dur, { type: "lowpass", f0: 380, q: 0.7, vol: 0.12 + strength * 0.2, curve: [0, 1, 1, 1, 0.6] });
  const rate = 6 + strength * 26;
  for (let t = 0; t < dur; t += rnd(0.5, 1.5) / rate) tone(at + t, rnd(180, 420), rnd(600, 1100), rnd(0.025, 0.06), 0.05 + strength * 0.07);
}

/** 똑 — 관 끝에서 떨어지는 물방울 */
export const drip = (at: number) => tone(at, 1300, 500, 0.07, 0.16);

/** 똑똑 — dur 동안 every초마다 */
export function drips(at: number, dur: number, every = 0.55) {
  for (let t = 0.1; t < dur; t += every + rnd(-0.08, 0.08)) drip(at + t);
}

/** 퐁 — 고체가 액체 속으로 떨어짐(물이 없으면 유리 바닥에 닿는 '탁') */
export function plop(at: number, intoLiquid: boolean) {
  if (intoLiquid) {
    tone(at, 320, 110, 0.18, 0.28);
    hiss(at, 0.12, { type: "bandpass", f0: 1200, q: 0.8, vol: 0.15, curve: [0, 1, 0] });
  } else tone(at, 900, 700, 0.12, 0.18, "triangle");
}

/** 팅 — 유리끼리 부딪치는 소리(얼음·유리 막대·끓임쪽) */
export function clink(at: number, vol = 0.12) {
  const f = rnd(2300, 3200);
  tone(at, f, f * 0.98, 0.35, vol, "triangle");
  tone(at, f * 1.5, f * 1.48, 0.22, vol * 0.5);
}

/** 삑 — 저울 영점·측정 */
export const beep = (at: number) => tone(at, 2050, 2050, 0.09, 0.08, "square");

/** 딸깍 — 다이얼·스탠드 집게 */
export function click(at: number) {
  hiss(at, 0.03, { type: "highpass", f0: 2500, vol: 0.35, curve: [0, 1, 0] });
  tone(at, 1500, 900, 0.03, 0.08, "square");
}

/** 사각사각 — 가루를 뜨고 붓기 */
export const powder = (at: number, dur = 0.45) => hiss(at, dur, { type: "highpass", f0: 3200, vol: 0.18, curve: [0, 0.7, 1, 0.5, 0] });

/** 찰랑찰랑 — 시험관 흔들기(물이 좌우로 출렁) */
export function shake(at: number, dur: number) {
  for (let t = 0; t < dur; t += 0.17) hiss(at + t, 0.14, { type: "bandpass", f0: rnd(700, 1100), q: 2, vol: 0.22, curve: [0, 1, 0.4, 0] });
}

/** 저어 주기 — 유리 막대가 비커 벽에 닿는 소리 + 소용돌이 */
export function stir(at: number, dur: number) {
  hiss(at, dur, { type: "bandpass", f0: 800, q: 1.2, vol: 0.12, curve: [0, 1, 0.6, 1, 0] });
  for (let t = 0.15; t < dur; t += 0.42) clink(at + t, 0.05);
}

/** 띵동 — 측정을 마쳤을 때 */
export function chime(at: number) {
  tone(at, 880, 880, 0.35, 0.07);
  tone(at + 0.16, 1320, 1320, 0.45, 0.07);
}
