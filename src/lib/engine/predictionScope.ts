/**
 * 어떤 예측을 물을까 (지침 3.1) — 학생 블록에 쓰인 물질에 맞는 예측만 묻는다.
 * 예: 물·식용유만 다루는 설계에서 철조각 예측을 묻지 않는다. 예측에 subjects가 없는 실험은 예전처럼(실행 전 첫 예측, 그래프 전 전부).
 */
import type { AnyCatalog, PredictionTarget } from "./experiments/types";
import type { Program } from "./types";

/** 블록 빈칸에 쓰인 준비물 id */
export function usedSubjects(program: Program): Set<string> {
  return new Set(program.steps.flatMap((s) => s.slots.flatMap((v) => (v && v.kind === "equip" ? [v.id] : []))));
}

const overlap = (t: PredictionTarget, used: Set<string>) => (t.subjects ?? []).filter((x) => used.has(x)).length;
const covered = (t: PredictionTarget, used: Set<string>) => Boolean(t.subjects?.length) && t.subjects!.every((x) => used.has(x));

/**
 * 실행 전에 물을 예측 — 블록이 그 예측의 물질을 모두 다루면 그중 물질이 가장 많은 예측(넷을 한 비커에 → 비커 속 순서).
 * 모두 다루는 게 없으면 겹치는 비율이 가장 큰 예측, 그래도 같으면 앞의 것.
 * 예: 철조각 부피를 재려고 물을 부어도, 식용유가 없으니 철조각 예측을 묻는다.
 */
export function runTarget(catalog: AnyCatalog, program: Program): string | null {
  const targets = catalog.predictionTargets;
  if (targets.length === 0) return null;
  const used = usedSubjects(program);
  const full = targets.filter((t) => covered(t, used));
  if (full.length > 0) return full.reduce((a, t) => ((t.subjects?.length ?? 0) > (a.subjects?.length ?? 0) ? t : a), full[0]).id;
  const ratio = (t: PredictionTarget) => (t.subjects?.length ? overlap(t, used) / t.subjects.length : 0);
  return targets.reduce((a, t) => (ratio(t) > ratio(a) ? t : a), targets[0]).id;
}

/** 그래프를 보기 전에 물을 예측 — 실행 전 예측 + 블록이 다루는 물질을 모두 포함하는 예측 */
export function graphTargets(catalog: AnyCatalog, program: Program): string[] {
  const targets = catalog.predictionTargets;
  if (!targets.some((t) => t.subjects?.length)) return targets.map((t) => t.id);
  const used = usedSubjects(program);
  const first = runTarget(catalog, program);
  return targets.filter((t) => t.id === first || covered(t, used)).map((t) => t.id);
}
