/** 시뮬레이션·채점 서비스 (server-only) — 데모와 실제 세션이 같은 경로를 쓴다 (ADR-P04, P06) */
import "server-only";
import type { Program } from "@/lib/engine/types";
import { getCatalog } from "@/lib/engine/experiments";
import { getPhysics, paramsForSeed } from "@/lib/engine/experiments/physicsRegistry";
import { physicsFromSeed, simulate } from "@/lib/engine/simulator/run";
import { checkCalc, expectedValue, type CheckResult } from "@/lib/engine/grader/check";

export function runSeed(seed: string, runNo: number): string {
  return `${seed}:run${runNo}`;
}

export function runProgram(slug: string, program: Program, seed: string, runNo: number) {
  const catalog = getCatalog(slug);
  if (!catalog) throw new Error("unknown_experiment");
  const params = paramsForSeed(slug, seed);
  return simulate({ ...program, experiment: slug }, catalog, physicsFromSeed(params, runSeed(seed, runNo)));
}

export interface CheckArgs {
  slug: string;
  program: Program;
  seed: string;
  runNo: number;
  key: string;
  value: number;
  unit?: string;
}

export function checkValue(args: CheckArgs): CheckResult | null {
  const result = runProgram(args.slug, args.program, args.seed, args.runNo);
  const request = result.calcRequests.find((c) => c.key === args.key);
  const physics = getPhysics(args.slug);
  if (!request || !physics) return null;
  return checkCalc({
    request,
    measurements: result.measurements,
    value: args.value,
    unit: args.unit,
    params: paramsForSeed(args.slug, args.seed),
    rules: physics.answers,
  });
}

/** 튜터 상태 주입용(서버 내부) — 학생 응답으로 보내지 않는다 */
export function privateExpected(args: Omit<CheckArgs, "value" | "unit">): number | null {
  const result = runProgram(args.slug, args.program, args.seed, args.runNo);
  const request = result.calcRequests.find((c) => c.key === args.key);
  const physics = getPhysics(args.slug);
  if (!request || !physics) return null;
  const v = expectedValue({ request, measurements: result.measurements, params: paramsForSeed(args.slug, args.seed), rules: physics.answers });
  return Number.isFinite(v) ? v : null;
}
