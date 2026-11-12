/** 교사 화면용 — 예상 기록(target·choice id)을 학생이 본 질문과 고른 답(한국어)으로. 예상은 형성평가(FORMATIVE)라 맞고 틀림 없이 기록만 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";

export function predictionText(c: AnyCatalog, targetId: string, choiceId: string): { ask: string; answer: string } {
  const target = c.predictionTargets.find((x) => x.id === targetId);
  const answer = target?.choices.find((x) => x.id === choiceId)?.label ?? (choiceId === "sketch" ? "그래프를 직접 그림" : choiceId);
  return { ask: target?.question ?? targetId, answer };
}
