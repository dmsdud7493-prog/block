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
