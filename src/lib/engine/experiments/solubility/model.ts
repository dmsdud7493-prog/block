/**
 * 용해도 — 상태 모양·라벨·포화 계산 도우미 (프로토타입 solubility-lab.html의 newState/tubeInfo 이식).
 * 용해도 수치는 ctx.param("<용질>.sol.<온도>")로만 얻는다(dryRun에서는 NaN → 비교식은 모두 false 쪽으로 흐른다).
 */
import type { ReduceContext } from "../types";
import type { SimEvent, Step, StepOutcome } from "../../types";
import { fixJosa, round2 } from "../../format";

/** 실험 장치 설정(물성 아님 — 화면에도 그대로 보이는 조건) */
export const ROOM_T = 20;
export const TUBE_MAX = 20;
export const SCOOP_MAX = 15;
export const REPEAT_EACH_MAX = 5;
/** 반복 블록 안전 한도 (프로토타입은 30회, 0.1 g씩 넣는 경우까지 담으려고 넉넉히) */
export const REPEAT_LIMIT = 200;
export const BATHS: Record<string, number> = { hot_water: 60, ice_water: 0 };

export const TUBES = ["tube_a", "tube_b", "tube_c"] as const;
export type TubeId = (typeof TUBES)[number];
export const SOLUTES = ["kno3", "cuso4"];

export interface Tube {
  water: number;
  solute: string | null;
  added: number;
  temp: number;
  bath: string | null;
  clearedHot: boolean;
  crystal: boolean;
}

export interface SolubilityState {
  tubes: Record<TubeId, Tube>;
  paperOnScale: boolean;
  paper: { sub: string | null; amt: number };
  lastTube: TubeId | null;
  shown: { scale: boolean; tube_a: boolean; tube_b: boolean; tube_c: boolean };
}

export type Out = StepOutcome<SolubilityState> & { endTrial?: boolean };

const LABEL: Record<string, string> = {
  water: "물", kno3: "질산 칼륨", cuso4: "황산 구리(II)",
  tube_a: "시험관 A", tube_b: "시험관 B", tube_c: "시험관 C",
  scale: "전자저울", weighing_paper: "시약포지", spatula: "약숟가락",
  hot_water: "뜨거운 물", ice_water: "얼음물", thermometer: "온도계",
};
export const L = (id: string | null): string => (id ? LABEL[id] ?? id : "빈 칸");

const JOSA_II: Record<string, string> = { "은(는)": "는", "이(가)": "가", "을(를)": "를", "(으)로": "로" };

/** 황산 구리(II)처럼 괄호로 끝나는 이름은 '투'로 읽으므로 받침 없음 → 그다음 공용 fixJosa */
export function josa(text: string): string {
  const ii = text.replace(/\(II\)(은\(는\)|이\(가\)|을\(를\)|\(으\)로)/g, (_m, j: string) => `(II)${JOSA_II[j]}`);
  return fixJosa(ii);
}

export const isTube = (id: string | null): id is TubeId => id !== null && (TUBES as readonly string[]).includes(id);
export const isSolute = (id: string | null): id is string => id !== null && SOLUTES.includes(id);

export const eq = (step: Step, i: number): string | null => {
  const v = step.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};
export const num = (step: Step, i: number): number => {
  const v = step.slots[i];
  return v && v.kind === "quant" ? v.value : Number.NaN;
};

const newTube = (): Tube => ({ water: 0, solute: null, added: 0, temp: ROOM_T, bath: null, clearedHot: false, crystal: false });

export function initialSolubilityState(): SolubilityState {
  return {
    tubes: { tube_a: newTube(), tube_b: newTube(), tube_c: newTube() },
    paperOnScale: false,
    paper: { sub: null, amt: 0 },
    lastTube: null,
    shown: { scale: false, tube_a: false, tube_b: false, tube_c: false },
  };
}

export interface TubeInfo { dissolved: number; solid: number }

/** 시험관 속: 녹아 있는 양 / 녹지 않고 바닥에 남은 고체 */
export function tubeInfo(t: Tube, ctx: ReduceContext): TubeInfo {
  if (!t.solute || t.water <= 0) return { dissolved: 0, solid: 0 };
  const cap = (ctx.param(`${t.solute}.sol.${t.temp}`) * t.water) / 100;
  const d = Math.min(t.added, cap);
  const solid = t.added - d;
  return { dissolved: round2(d), solid: solid < 0.05 ? 0 : round2(solid) };
}

/** 저울 읽기: 영점 조정을 했으므로 시약포지 위 용질의 질량만 (측정 노이즈 0.01 g) */
export const weigh = (amt: number, ctx: ReduceContext): number =>
  round2(ctx.noise(amt, { abs: 0.01, resolution: 0.01 }));

/** 황산 구리(II) 용액의 파란색 진하기 0~1 (프로토타입 liquidColor: 녹은 양 4 g에서 최대) */
export function colorIntensity(t: Tube, info: TubeInfo): number {
  return t.solute === "cuso4" && info.dissolved > 0 ? Math.min(1, info.dissolved / 4) : 0;
}

export const updateTube = (s: SolubilityState, id: TubeId, patch: Partial<Tube>): SolubilityState => ({
  ...s,
  tubes: { ...s.tubes, [id]: { ...s.tubes[id], ...patch } },
});

/** 이 용질이 들어 있는 시험관 (마지막으로 쓴 시험관 우선) */
export function tubeWith(s: SolubilityState, sub: string): TubeId | null {
  const order: TubeId[] = s.lastTube ? [s.lastTube, ...TUBES] : [...TUBES];
  return order.find((id) => s.tubes[id].solute === sub) ?? null;
}

/** 실험 모니터용 장면 상태 */
export function scene(s: SolubilityState, ctx: ReduceContext) {
  const tubes = TUBES.map((id) => {
    const t = s.tubes[id];
    const info = tubeInfo(t, ctx);
    return { id, ...t, dissolved: info.dissolved, solid: info.solid, colorIntensity: colorIntensity(t, info) };
  });
  return { tubes, paperOnScale: s.paperOnScale, paper: s.paper, scaleReading: s.paperOnScale ? s.paper.amt : 0 };
}

export const fail = (s: SolubilityState, code: string, message: string): Out => ({
  state: s,
  error: { code, message: josa(message) },
});

export function ev(type: string, note: string, s: SolubilityState, ctx: ReduceContext, extra: Record<string, unknown> = {}): SimEvent {
  return { type, note: josa(note), scene: scene(s, ctx), ...extra };
}
