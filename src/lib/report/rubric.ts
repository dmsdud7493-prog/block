/** 교사 루브릭 4항목 × 상중하 (plan §4.9). 문구는 반 설정에서 바꿀 수 있게 상수로 둔다 */
export type RubricLevel = "high" | "mid" | "low";

export interface RubricItem {
  id: "hypothesis_variables" | "data" | "interpretation" | "reflection";
  title: string;
  levels: Record<RubricLevel, string>;
}

export const RUBRIC: RubricItem[] = [
  { id: "hypothesis_variables", title: "가설·변인 설계", levels: { high: "검증 가능한 가설과 조작·종속·통제 변인을 정확히 구분함", mid: "가설·변인이 있으나 일부가 모호함", low: "가설이나 변인 구분이 빠짐" } },
  { id: "data", title: "자료 정리", levels: { high: "측정값·계산값을 단위와 함께 정확히 정리하고 그래프를 해석함", mid: "자료를 정리했으나 단위·계산에 일부 오류", low: "자료 정리가 불충분함" } },
  { id: "interpretation", title: "해석·결론", levels: { high: "가설–증거 관계를 근거 값으로 설명하고 오차·한계를 제시함", mid: "결론은 있으나 근거나 오차 설명이 부족함", low: "결론이 자료와 연결되지 않음" } },
  { id: "reflection", title: "성찰", levels: { high: "예측–결과 차이의 원인과 다음 탐구 개선점을 구체적으로 성찰함", mid: "성찰이 있으나 일반적임", low: "성찰이 거의 없음" } },
];

export const LEVEL_LABEL: Record<RubricLevel, string> = { high: "상", mid: "중", low: "하" };

/** 코멘트 뱅크 (plan §8.1 교사 업무 경감) — 교사가 골라 넣고 고쳐 쓴다. 행동을 짚는 격려형 문장만 */
export const COMMENT_BANK: { id: RubricItem["id"]; phrases: string[] }[] = [
  { id: "hypothesis_variables", phrases: ["가설에 ‘왜 그렇게 생각했는지’ 까닭을 한 줄 더 써 보자.", "통제 변인을 하나 더 찾아 적어 보면 실험이 더 공정해져요."] },
  { id: "data", phrases: ["계산값 옆에 단위를 꼭 붙여 보자.", "표의 값과 그래프의 점이 같은지 한 번 더 확인해 보자."] },
  { id: "interpretation", phrases: ["결론의 근거가 되는 값을 표에서 골라 직접 적어 보자.", "오차가 생긴 까닭을 실험 과정의 한 단계와 연결해 보자."] },
  { id: "reflection", phrases: ["예상과 결과가 달랐던 까닭을 구체적으로 적은 점이 좋아요.", "다음에 바꿔 보고 싶은 변인을 하나 정해 보자."] },
];
