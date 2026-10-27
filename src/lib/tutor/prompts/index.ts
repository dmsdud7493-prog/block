/** 실험별 튜터 메모 레지스트리 (server-only) */
import "server-only";
import { EXPERIMENT_NOTES as density } from "./experiments/density";
import { EXPERIMENT_NOTES as melting } from "./experiments/melting";
import { EXPERIMENT_NOTES as boiling } from "./experiments/boiling";
import { EXPERIMENT_NOTES as solubility } from "./experiments/solubility";
import { EXPERIMENT_NOTES as separation1 } from "./experiments/separation1";
import { EXPERIMENT_NOTES as separation2 } from "./experiments/separation2";

const NOTES: Record<string, string> = { density, melting, boiling, solubility, separation1, separation2 };

export function experimentNotes(slug: string): string {
  return NOTES[slug] ?? "";
}
