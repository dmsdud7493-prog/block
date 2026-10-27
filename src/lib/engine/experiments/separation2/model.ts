/**
 * 용해도 차를 이용한 혼합물 분리(재결정) — 상태 타입·라벨·용해도 보간 (클라이언트 허용: 수치 없음).
 * 용해도 표 값은 physics.ts(server-only)의 파라미터 "sol.<물질>.<온도>"로만 들어온다.
 * solAt은 프로토타입 mixture_separation_lab2.html의 solAt(구간 선형 보간)과 같은 규칙이다.
 */
import type { ReduceContext } from "../types";
import type { Step, StepOutcome } from "../../types";
import { fixJosa, round2 } from "../../format";

export type Solute = "boric_acid" | "cuso4";
export type Pair = Record<Solute, number>;

export const SOLUTES: Solute[] = ["boric_acid", "cuso4"];
export const WATERS = ["hot_water", "ice_water"] as const;
/** 용해도 표의 온도 눈금 (0~100 °C, 10 °C 간격) */
export const SOL_GRID = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/** 비커·큰 비커 용량은 기구 정보(정답 아님) — 프로토타입 BKR_MAX, BATH_MAX, BATH_FILL */
export const BKR_MAX = 200;
export const BATH_MAX = 500;
export const BATH_FILL = 300;
/** 실험실(처음 비커) 온도 — 프로토타입 newBeaker().T */
export const ROOM_T = 20;

export interface Beaker {
  water: number;
  T: number;
  dis: Pair;
  undis: Pair;
  xtal: Pair;
  stirred: boolean;
}

export interface FilterState {
  ready: boolean;
  done: boolean;
  paper: Pair;
  fw: number;
  fdis: Pair;
  fT: number | null;
  cooled: boolean;
  hotT: number | null;
}

export interface Separation2State {
  bkr: Beaker;
  /** 이번 시도에서 비커에 넣은 가루의 양 */
  added: Pair;
  thermo: boolean;
  bath: number;
  inBath: boolean;
  cooled: boolean;
  hotT: number | null;
  filter: FilterState;
  scale: number;
  checked: boolean;
  /** 결과를 확인한 시도 번호 — 선택 블록(결정 질량 측정)이 이 시도에 붙는다 */
  resultTrial: number | null;
  weighed: number | null;
  shown: { bkr: boolean; bath: boolean; filter: boolean; scale: boolean };
}

export type Out = StepOutcome<Separation2State> & { endTrial?: boolean };

export const pair = (): Pair => ({ boric_acid: 0, cuso4: 0 });

export function newBeaker(T = ROOM_T): Beaker {
  return { water: 0, T, dis: pair(), undis: pair(), xtal: pair(), stirred: false };
}

export function initialSeparation2State(): Separation2State {
  return {
    bkr: newBeaker(),
    added: pair(),
    thermo: false,
    bath: 0,
    inBath: false,
    cooled: false,
    hotT: null,
    filter: { ready: false, done: false, paper: pair(), fw: 0, fdis: pair(), fT: null, cooled: false, hotT: null },
    scale: 0,
    checked: false,
    resultTrial: null,
    weighed: null,
    shown: { bkr: false, bath: false, filter: false, scale: false },
  };
}

const LABEL: Record<string, string> = {
  boric_acid: "붕산", cuso4: "황산 구리(II)", hot_water: "뜨거운 물", ice_water: "얼음물",
  beaker: "비커", large_beaker: "큰 비커", glass_rod: "유리 막대", thermometer: "온도계",
  stand: "스탠드", funnel: "깔때기", filter_paper: "거름종이", scale: "전자저울",
};
export const L = (id: string | null): string => (id ? LABEL[id] ?? id : "빈 칸");

export const isSolute = (id: string | null): id is Solute => id === "boric_acid" || id === "cuso4";
export const isWater = (id: string | null): boolean => id === "hot_water" || id === "ice_water";

export const fail = (s: Separation2State, code: string, message: string): Out => ({
  state: s,
  error: { code, message: fixJosa(message) },
});

export const eq = (step: Step, i: number): string | null => {
  const v = step.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};

export const num = (step: Step, i: number): number => {
  const v = step.slots[i];
  return v && v.kind === "quant" ? v.value : Number.NaN;
};

export const unitOf = (step: Step, i: number): string => {
  const v = step.slots[i];
  return v && v.kind === "quant" ? v.unit : "";
};

/** 물 100 g에 녹을 수 있는 최대 질량(g) — 표를 구간 선형 보간 (프로토타입 solAt) */
export function solFromTable(get: (key: string) => number, n: Solute, temp: number): number {
  if (Number.isNaN(temp)) return Number.NaN;
  const T = Math.max(0, Math.min(100, temp));
  const at = (t: number): number => get(`sol.${n}.${t}`);
  const i = SOL_GRID.findIndex((t1, k) => k > 0 && T <= t1);
  if (i < 0) return at(SOL_GRID[SOL_GRID.length - 1]);
  const t0 = SOL_GRID[i - 1];
  const t1 = SOL_GRID[i];
  return at(t0) + (at(t1) - at(t0)) * (T - t0) / (t1 - t0);
}

export const solAt = (ctx: ReduceContext, n: Solute, T: number): number => solFromTable(ctx.param, n, T);

export const capOf = (ctx: ReduceContext, n: Solute, T: number, water: number): number =>
  solAt(ctx, n, T) * water / 100;

export const totalOf = (b: Beaker, n: Solute): number => b.dis[n] + b.undis[n] + b.xtal[n];

/**
 * 녹을 수 있는 양을 넘은 만큼 결정으로 나온다.
 * dryRun(용해도 NaN)에서는 녹아 있던 물질의 결정 양을 "알 수 없음"(NaN)으로 둔다 — 이후의 수치 검사가 모두 통과 쪽으로 흐른다.
 */
export function precipitate(b: Beaker, ctx: ReduceContext): Beaker {
  return SOLUTES.reduce<Beaker>((acc, n) => {
    const cap = capOf(ctx, n, acc.T, acc.water);
    if (Number.isNaN(cap)) {
      return acc.dis[n] > 0 ? { ...acc, xtal: { ...acc.xtal, [n]: Number.NaN }, dis: { ...acc.dis, [n]: Number.NaN } } : acc;
    }
    if (!(acc.dis[n] > cap + 1e-9)) return acc;
    return {
      ...acc,
      xtal: { ...acc.xtal, [n]: round2(acc.xtal[n] + acc.dis[n] - cap) },
      dis: { ...acc.dis, [n]: round2(cap) },
    };
  }, b);
}

/** 결과 확인 뒤 다시 넣거나 설치하면 도구를 깨끗이 비우고 새 시도 (프로토타입 startNewTrial) */
export const freshIfChecked = (s: Separation2State): Separation2State =>
  (s.checked ? initialSeparation2State() : s);

export const AFTER_FILTER = "이미 거르기까지 끝났어요. 먼저 '거름종이 위의 물질과 걸러진 용액을 확인한다' 블록으로 결과를 확인해 주세요.";

/** 장면 표시용 요약 — 모든 이벤트에 붙인다 (녹음/안 녹음, 결정 양, 용액 색, 온도, 거름 장치 상태) */
export function sceneOf(s: Separation2State): Record<string, unknown> {
  const b = s.bkr;
  return {
    temperature: b.T,
    water: b.water,
    dissolved: { ...b.dis },
    undissolved: { ...b.undis },
    crystals: { ...b.xtal },
    solutionColor: b.dis.cuso4 > 0 ? "blue" : "clear",
    inBath: s.inBath,
    bath: s.bath,
    filter: s.filter.done ? "done" : s.filter.ready ? "ready" : "none",
    paper: { ...s.filter.paper },
  };
}
