/**
 * simulate / dryRun — 모든 실험이 공유하는 결정론적 실행 루프 (plan.md §4.3).
 * dryRun은 같은 리듀서를 NaN 물성으로 돌려 진단만 돌려준다 → 편집 중 경고와 실행 오류가 일치(D4).
 */
import type { CalcRequest, Diagnostic, Frame, Measurement, Program, Series, SimulationResult } from "../types";
import type { AnyCatalog, NoiseSpec, ReduceContext } from "../experiments/types";
import { checkAllSlots } from "../rules/slots";
import { checkVariables } from "../rules/variables";
import { checkFixedAmounts } from "../rules/fixedAmounts";

/** 배정 설정에 따른 추가 규칙 — fixedAmounts: 교사가 넣는 양을 정해 줌(ADR-P26) */
export interface SimOptions { fixedAmounts?: boolean }
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
  warnings: Diagnostic[];
  stoppedAt: number | null;
}

/** 같은 key의 시계열 조각(예: 끓을 때까지 + 끓은 뒤 더 측정)을 하나로 잇는다 */
export function mergeSeries(list: Series[], add: Series[]): Series[] {
  return add.reduce((acc, piece) => {
    const i = acc.findIndex((x) => x.key === piece.key);
    if (i < 0) return [...acc, piece];
    return acc.map((x, j) => (j === i ? { ...x, points: [...x.points, ...piece.points] } : x));
  }, list);
}

/**
 * 시도를 마치는 단계의 화면 — 가열 실험은 다음 시도를 위해 상태가 처음으로 돌아가 장치가 한꺼번에 사라졌다.
 * 그 단계의 장면은 바로 앞 장치를 그대로 두고 가열만 끈 모습으로 보여 준다(다음 단계 계산은 처음 상태로). 2026-11-17 점검
 */
function endView(before: unknown, after: unknown): unknown {
  if (!before || typeof before !== "object" || !("heating" in before)) return after;
  const b = before as Record<string, unknown>;
  return { ...b, heating: false, ...("bubbles" in b ? { bubbles: 0 } : {}), ...("vapour" in b ? { vapour: false } : {}) };
}

function runSteps(program: Program, catalog: AnyCatalog, src: PhysicsSource | null): Acc {
  const init: Acc = { state: catalog.initialState(), trial: 1, frames: [], measurements: [], calcRequests: [], series: [], error: null, warnings: [], stoppedAt: null };
  return program.steps.reduce<Acc>((acc, step, i) => {
    if (acc.error) return acc;
    const out = catalog.reduce(acc.state, step, makeContext(src, acc.trial, i));
    if (out.error) {
      const d: Diagnostic = { blockId: step.blockId, severity: "error", code: out.error.code, message: out.error.message, guideline: out.error.guideline ?? "2.3" };
      return { ...acc, error: d, stoppedAt: i };
    }
    const warns: Diagnostic[] = (out.warnings ?? []).map((w) => ({ blockId: step.blockId, severity: "warn", code: w.code, message: w.message, guideline: w.guideline ?? "3.3" }));
    const frame: Frame = { stepIndex: i, blockId: step.blockId, event: out.event ?? { type: "noop", note: "" }, state: out.endTrial ? endView(acc.state, out.state) : out.state };
    return {
      ...acc,
      state: out.state,
      trial: out.endTrial ? acc.trial + 1 : acc.trial,
      frames: [...acc.frames, frame],
      measurements: [...acc.measurements, ...(out.measurements ?? [])],
      calcRequests: [...acc.calcRequests, ...(out.calcRequests ?? [])],
      series: mergeSeries(acc.series, out.series ?? []),
      warnings: [...acc.warnings, ...warns],
    };
  }, init);
}

export function simulate(program: Program, catalog: AnyCatalog, src: PhysicsSource | null, opts: SimOptions = {}): SimulationResult {
  const slotDiags = [...checkAllSlots(catalog.actions, program.steps), ...(opts.fixedAmounts ? checkFixedAmounts(catalog, program.steps) : [])];
  const varDiags = checkVariables(program, catalog.variableOptions, catalog.isTrialEnd);
  if (slotDiags.length > 0) {
    return { ok: false, frames: [], diagnostics: [...slotDiags, ...varDiags], measurements: [], calcRequests: [], series: [], stoppedAt: null };
  }
  const acc = runSteps(program, catalog, src);
  const diagnostics = [...(acc.error ? [acc.error] : []), ...acc.warnings, ...varDiags];
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
export function dryRun(program: Program, catalog: AnyCatalog, opts: SimOptions = {}): Diagnostic[] {
  return simulate(program, catalog, null, opts).diagnostics;
}

export function physicsFromSeed(params: Record<string, number>, seed: string, noisy = true): PhysicsSource {
  return { params, rng: createRng(seed), noisy };
}
