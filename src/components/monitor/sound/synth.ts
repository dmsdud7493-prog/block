"use client";
/**
 * 실험 효과음 합성 — 녹음 파일 없이 Web Audio로 만든다(저작권·용량 걱정 없음, 사용자 요청 2026-11-17).
 * 모든 소리는 master 게인을 거치고, stopAll()로 한꺼번에 부드럽게 끈다(일시정지·소리 끄기·다음 단계).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
const live = new Set<AudioScheduledSourceNode>();

/** 소리 장치 — 학생이 버튼을 누른 뒤(사용자 동작)에 만들어야 브라우저가 소리를 허락한다 */
export function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return master ? { ctx, out: master } : null;
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise) return noise;
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  noise = buf;
  return buf;
}

function track<T extends AudioScheduledSourceNode>(n: T): T {
  live.add(n);
  n.onended = () => live.delete(n);
  return n;
}

/** 진행 중인 소리를 모두 멈춘다 */
export function stopAll() {
  live.forEach((n) => {
    try {
      n.stop();
    } catch {
      // 이미 끝난 소리
    }
  });
  live.clear();
}

/** 감쇠하는 짧은 음 — 유리 '팅', 저울 '삑', 물방울 '똑' 같은 소리의 바탕 */
export function tone(at: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + at;
  const o = track(a.ctx.createOscillator());
  const g = a.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** 걸러진 잡음 — 물 흐르는 소리·가루 소리·끓는 소리의 바탕. curve가 있으면 그 모양으로 크기가 바뀐다 */
export function hiss(at: number, dur: number, opt: { type: BiquadFilterType; f0: number; f1?: number; q?: number; vol: number; curve?: number[] }) {
  const a = audio();
  if (!a || dur <= 0) return;
  const t = a.ctx.currentTime + at;
  const src = track(a.ctx.createBufferSource());
  src.buffer = noiseBuffer(a.ctx);
  src.loop = true;
  const f = a.ctx.createBiquadFilter();
  f.type = opt.type;
  f.Q.value = opt.q ?? 1;
  f.frequency.setValueAtTime(opt.f0, t);
  if (opt.f1) f.frequency.linearRampToValueAtTime(opt.f1, t + dur);
  const g = a.ctx.createGain();
  const shape = opt.curve ?? [0, 1, 1, 1, 0];
  g.gain.setValueCurveAtTime(new Float32Array(shape.map((v) => Math.max(0.0001, v * opt.vol))), t, dur);
  src.connect(f).connect(g).connect(a.out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}
