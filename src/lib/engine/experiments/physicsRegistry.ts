/** 물성·정답 규칙 레지스트리 — server-only (ADR-P04) */
import "server-only";
import type { PhysicsModule } from "./physicsTypes";
import { densityPhysics } from "./density/physics";
import { meltingPhysics } from "./melting/physics";
import { boilingPhysics } from "./boiling/physics";
import { solubilityPhysics } from "./solubility/physics";
import { separation1Physics } from "./separation1/physics";
import { createRng } from "../rng";
import { separation2Physics } from "./separation2/physics";

export const PHYSICS: Record<string, PhysicsModule> = {
  density: densityPhysics,
  melting: meltingPhysics,
  boiling: boilingPhysics,
  solubility: solubilityPhysics,
  separation1: separation1Physics,
  separation2: separation2Physics,
};

export function getPhysics(slug: string): PhysicsModule | null {
  return PHYSICS[slug] ?? null;
}

/** 세션 seed로 학생별 물성 파라미터를 만든다 (같은 seed → 같은 값) */
export function paramsForSeed(slug: string, seed: string | null): Record<string, number> {
  const mod = getPhysics(slug);
  if (!mod) throw new Error(`unknown experiment: ${slug}`);
  const textbookMode = process.env.TEXTBOOK_MODE !== "false";
  return mod.sessionParams(seed === null ? null : createRng(`${seed}:params`), { textbookMode });
}
