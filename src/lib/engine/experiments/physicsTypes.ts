/** 서버 전용 물성·정답 규칙 계약 (ADR-P04) */
import type { Rng } from "../rng";

export type AnswerFamily = "ratio" | "per100" | "plateau" | "precipitate";

export interface AnswerRule {
  /** CalcRequest.key 접두어 — 예: "density." */
  prefix: string;
  family: AnswerFamily;
  label: string;
  unit: string;
  tolerance: { rel?: number; abs?: number };
  /** 단위 선택지 — 첫 번째가 바른 단위 */
  unitChoices: string[];
  /** plateau/precipitate처럼 측정값만으로 계산되지 않는 정답을 물성에서 구할 때 */
  fromParams?: (subject: string, params: Record<string, number>, inputs: number[]) => number;
}

export interface PhysicsOptions {
  /** true(기본): 교과서 값(라우르산 44 ℃ 등), false: NIST 참조값(43.9 ℃ 등) — plan D14 */
  textbookMode?: boolean;
}

export interface PhysicsModule {
  slug: string;
  /** rng=null이면 기준값 그대로(골든 테스트) */
  sessionParams: (rng: Rng | null, opts?: PhysicsOptions) => Record<string, number>;
  answers: AnswerRule[];
}
