/**
 * simulate / dryRun — 모든 실험이 공유하는 결정론적 실행 루프 (plan.md §4.3).
 * dryRun은 같은 리듀서를 NaN 물성으로 돌려 진단만 돌려준다 → 편집 중 경고와 실행 오류가 일치(D4).
 */
import type { CalcRequest, Diagnostic, Frame, Measurement, Program, Series, SimulationResult } from "../types";
import type { AnyCatalog, NoiseSpec, ReduceContext } from "../experiments/types";
import { checkAllSlots } from "../rules/slots";
import { checkVariables } from "../rules/variables";
import { createRng, jitter, type Rng } from "../rng";

export interface PhysicsSource {
  params: Record<string, number>;
  rng: Rng;
  /** false면 노이즈 0 (골든 테스트) */
  noisy: boolean;
}

function applyNoise(value: number, spec: NoiseSpec, src: PhysicsSource | null): number {
  if (!src || Number.isNaN(value)) return value;
  const r = src.noisy ? jitter(src.rng) : 0;
  const withNoise = value + r * (spec.abs ?? 0) + value * r * (spec.rel ?? 0);
  const res = spec.resolution;
  return res ? Math.round(withNoise / res) * res : withNoise;
}

function makeContext(src: PhysicsSource | null, trial: number, stepIndex: number): ReduceContext {
  return {
    param: (key) => {
      if (!src) return Number.NaN;
      const v = src.params[key];
      if (v === undefined) throw new Error(`unknown physics param: ${key}`);
      return v;
    },
    noise: (value, spec) => applyNoise(value, spec, src),
    trial,
    stepIndex,
  };
}

interface Acc {
  state: unknown;
  trial: number;
  frames: Frame[];
  measurements: Measurement[];
  calcRequests: CalcRequest[];
  series: Series[];
  error: Diagnostic | null;
  stoppedAt: number | null;
}

function runSteps(program: Program, catalog: AnyCatalog, src: PhysicsSource | null): Acc {
  const init: Acc = { state: catalog.initialState(), trial: 1, frames: [], measurements: [], calcRequests: [], series: [], error: null, stoppedAt: null };
  return program.steps.reduce<Acc>((acc, step, i) => {
    if (acc.error) return acc;
    const out = catalog.reduce(acc.state, step, makeContext(src, acc.trial, i));
    if (out.error) {
      const d: Diagnostic = { blockId: step.blockId, severity: "error", code: out.error.code, message: out.error.message, guideline: out.error.guideline ?? "2.3" };
      return { ...acc, error: d, stoppedAt: i };
    }
    const frame: Frame = { stepIndex: i, blockId: step.blockId, event: out.event ?? { type: "noop", note: "" }, state: out.state };
    return {
      ...acc,
      state: out.state,
      trial: out.endTrial ? acc.trial + 1 : acc.trial,
      frames: [...acc.frames, frame],
      measurements: [...acc.measurements, ...(out.measurements ?? [])],
      calcRequests: [...acc.calcRequests, ...(out.calcRequests ?? [])],
      series: [...acc.series, ...(out.series ?? [])],
    };
  }, init);
}

export function simulate(program: Program, catalog: AnyCatalog, src: PhysicsSource | null): SimulationResult {
  const slotDiags = checkAllSlots(catalog.actions, program.steps);
  const varDiags = checkVariables(program, catalog.variableOptions, catalog.isTrialEnd);
  if (slotDiags.length > 0) {
    return { ok: false, frames: [], diagnostics: [...slotDiags, ...varDiags], measurements: [], calcRequests: [], series: [], stoppedAt: null };
  }
  const acc = runSteps(program, catalog, src);
  const diagnostics = acc.error ? [acc.error, ...varDiags] : varDiags;
  return {
    ok: acc.error === null,
    frames: acc.frames,
    diagnostics,
    measurements: acc.measurements,
    calcRequests: acc.calcRequests,
    series: acc.series,
    stoppedAt: acc.stoppedAt,
  };
}

/** 편집 중 점검 — 물성 없이 규칙만 (클라이언트에서 실행 가능) */
export function dryRun(program: Program, catalog: AnyCatalog): Diagnostic[] {
  return simulate(program, catalog, null).diagnostics;
}

export function physicsFromSeed(params: Record<string, number>, seed: string, noisy = true): PhysicsSource {
  return { params, rng: createRng(seed), noisy };
}
