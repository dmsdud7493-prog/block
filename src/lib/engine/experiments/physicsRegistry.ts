/** 물성·정답 규칙 레지스트리 — server-only (ADR-P04) */
import "server-only";
import type { PhysicsModule } from "./physicsTypes";
import { densityPhysics } from "./density/physics";
import { createRng } from "../rng";

export const PHYSICS: Record<string, PhysicsModule> = {
  density: densityPhysics,
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
