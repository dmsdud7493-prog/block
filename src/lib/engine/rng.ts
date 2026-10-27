/** 시드 기반 결정론적 난수 (mulberry32). 같은 seed → 같은 측정값 (CLAUDE.md 규칙 3). */
export type Rng = () => number;

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: string | number): Rng {
  let a = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [-1, 1) 균등 분포 */
export function jitter(rng: Rng): number {
  return rng() * 2 - 1;
}

/** 노이즈 없는 rng: 골든 테스트용 (jitter → 0) */
export const NO_NOISE: Rng = () => 0.5;
