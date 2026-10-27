/** 튜터 모델 선택 (D8) — 키가 없거나 체험 모드에서 허용되지 않으면 null → 규칙 기반 튜터 */
import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/** 비용 집계(v_llm_usage_daily)에 남길 모델 이름 */
export const tutorModelId = () => process.env.CLAUDE_MODEL_TUTOR || "claude-haiku-5-5";

export function tutorModel(mode: "demo" | "session"): LanguageModel | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (mode === "demo" && process.env.DEMO_TUTOR_ENABLED !== "true") return null;
  return createAnthropic({ apiKey })(tutorModelId());
}

export function graderModel(): LanguageModel | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return createAnthropic({ apiKey })(process.env.CLAUDE_MODEL_GRADER || "claude-sonnet-5-5");
}
