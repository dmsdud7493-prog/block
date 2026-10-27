/**
 * 재결정(혼합물 분리) — 물성 수치(server-only). 프로토타입 mixture_separation_lab2.html의 SOL 표
 * (물 100 g에 녹는 최대 질량, 황산 구리(II)는 무수물 기준), 뜨거운 물 80 °C·얼음물 5 °C·식힌 온도 10 °C를 그대로 쓴다.
 * 세션 seed로 식힌 끝 온도만 ±1 °C 바꾼다(전자저울 노이즈 0.01 g은 리듀서의 ctx.noise).
 * textbookMode는 계약상 받지만 이 실험은 교과서 값 하나만 둔다.
 */
import "server-only";
import type { Rng } from "../../rng";
import { jitter } from "../../rng";
import type { AnswerRule, PhysicsModule, PhysicsOptions } from "../physicsTypes";
import { SOL_GRID, solFromTable, type Solute } from "./model";
import { SOL_TABLE } from "./table";

const SOL = SOL_TABLE;

const tableParams = (n: Solute): Record<string, number> =>
  Object.fromEntries(SOL_GRID.map((t, i) => [`sol.${n}.${t}`, SOL[n][i]]));

const BASE: Record<string, number> = {
  ...tableParams("boric_acid"),
  ...tableParams("cuso4"),
  "hot_water.temp": 80,
  "ice_water.temp": 5,
  "cool.temp": 10,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 계약(PhysicsModule)상 옵션을 받는다
function sessionParams(rng: Rng | null, _opts?: PhysicsOptions): Record<string, number> {
  if (!rng) return { ...BASE };
  return { ...BASE, "cool.temp": Math.round((10 + jitter(rng)) * 10) / 10 };
}

const isSolute = (s: string): s is Solute => s === "boric_acid" || s === "cuso4";

/** 석출량 = 넣은 양 − (식힌 온도의 용해도 × 물의 질량 ÷ 100). inputs = [넣은 양, 물의 질량, 식힌 온도] */
function precipitateFrom(subject: string, params: Record<string, number>, inputs: number[]): number {
  if (!isSolute(subject)) return Number.NaN;
  const [added, water, tCold] = inputs;
  const T = Number.isFinite(tCold) ? tCold : params["cool.temp"];
  const get = (k: string): number => params[k] ?? Number.NaN;
  return added - solFromTable(get, subject, T) * water / 100;
}

const answers: AnswerRule[] = [
  {
    prefix: "precip.",
    family: "precipitate",
    label: "석출되는 붕산의 양(이론값)",
    unit: "g",
    tolerance: { rel: 0.03, abs: 0.2 },
    unitChoices: ["g", "g/물 100 g"],
    fromParams: precipitateFrom,
  },
];

export const separation2Physics: PhysicsModule = { slug: "separation2", sessionParams, answers };
