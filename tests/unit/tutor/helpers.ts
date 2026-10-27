import { densityCatalog } from "@/lib/engine/experiments/density/catalog";
import { buildState, type TutorContext } from "@/lib/tutor/stateInjection";
import type { Program } from "@/lib/engine/types";

export const baseCtx: TutorContext = {
  phase: "design", predictionTargetsDone: [], diagnostics: [], checks: [], measurements: [], changedVars: [],
  runOk: null, idleSeconds: 0, lastHintLevel: -1, nudgeSent: false, reportSection: null,
};

export const program: Program = {
  experiment: "density",
  steps: [{ blockId: "b1", action: "a1", slots: [{ kind: "equip", id: "cylinder" }, { kind: "equip", id: "scale" }] }],
  variables: [{ blockId: "v1", role: "independent", optionId: "iron_size", rationale: "크기만 바꾸려고" }],
};

export function state(ctx: Partial<TutorContext> = {}, extra: Partial<{ hintLevelMax: number; studentAttempted: boolean; failCount: number }> = {}) {
  return buildState({ catalog: densityCatalog, program, ctx: { ...baseCtx, ...ctx }, tone: "haeyo", scaffoldLevel: 0, hintLevelMax: extra.hintLevelMax ?? 1, studentAttempted: extra.studentAttempted ?? true, failCount: extra.failCount ?? 0 });
}
