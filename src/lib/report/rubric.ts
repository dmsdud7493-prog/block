/**
 * 교사 루브릭 4항목 × 상중하 — 지금의 탐구 보고서(교과서 활동지형: 가설·과정 / 자료 해석 / 정리 / 성찰)에 맞춘다(ADR-P24).
 * 근거: 과학 실천(NRC, 2012: 탐구 계획·수행, 자료 분석·해석, 수학적 사고, 증거 기반 설명),
 * 주장–증거–추론(CER) 설명 루브릭(McNeill et al., 2006), 과학 글쓰기 발견법(SWH; Keys et al., 1999)의 주장·증거·성찰,
 * 실험 보고서 범용 루브릭(Timmerman et al., 2011)의 가설·실험 설계·자료·결론·한계 항목, 성찰 프롬프트(Davis, 2003).
 * id는 저장된 채점(DB 체크 제약 0006)과 맞추기 위해 그대로 두고 제목·기준 문장만 바꾼다.
 */
export type RubricLevel = "high" | "mid" | "low";

export interface RubricItem {
  id: "hypothesis_variables" | "data" | "interpretation" | "reflection";
  title: string;
  /** 보고서에서 볼 곳 */
  where: string;
  levels: Record<RubricLevel, string>;
}

export const RUBRIC: RubricItem[] = [
  { id: "hypothesis_variables", title: "탐구 설계", where: "가설·준비물·과정(활동 1·2·3)", levels: {
    high: "탐구 문제에 맞는 가설을 까닭과 함께 세우고, 미션별 실험 과정을 같게 할 조건(같은 양·같은 기구)을 지키며 순서대로 제시함",
    mid: "가설과 실험 과정은 있으나 가설의 까닭이 부족하거나, 과정의 순서·조건이 일부 모호함",
    low: "가설이 없거나 실험 과정이 탐구 문제와 연결되지 않음",
  } },
  { id: "data", title: "자료 분석·해석", where: "자료 해석(자료 1·2·3)", levels: {
    high: "측정값과 계산값(밀도·용해도 등)을 단위와 함께 정확히 정리하고, 표·그래프에서 규칙성이나 차이를 찾아 자료마다 알 수 있는 점을 씀",
    mid: "자료는 정리했으나 단위·계산에 일부 오류가 있거나, 자료에서 알 수 있는 점이 일부 빠짐",
    low: "자료 정리가 불충분하거나 자료에서 알 수 있는 점을 쓰지 않음",
  } },
  { id: "interpretation", title: "증거 기반 결론", where: "정리 1·2(탐구 결과 해석·결론 정리)", levels: {
    high: "가설이 맞았는지에 대한 판단(주장)을 자료의 구체적인 값(증거)으로 뒷받침하고 과학 개념으로 까닭(추론)을 설명하며, 오차의 원인과 개선점을 제시함",
    mid: "결론은 있으나 근거가 되는 값, 과학 개념을 이용한 설명, 오차·개선점 가운데 일부가 부족함",
    low: "결론이 자료와 연결되지 않거나 근거 없이 주장만 함",
  } },
  { id: "reflection", title: "성찰", where: "정리 3(성찰)", levels: {
    high: "어려웠던 점과 해결 과정, 더 알고 싶은 점, 생활 속 연결을 자신의 탐구 경험에 비추어 구체적으로 씀",
    mid: "성찰은 있으나 일반적인 내용이거나 일부 질문에만 답함",
    low: "성찰이 거의 없음",
  } },
];

export const LEVEL_LABEL: Record<RubricLevel, string> = { high: "상", mid: "중", low: "하" };

/** 코멘트 뱅크 (plan §8.1 교사 업무 경감) — 교사가 골라 넣고 고쳐 쓴다. 행동을 짚는 격려형 문장만 */
export const COMMENT_BANK: { id: RubricItem["id"]; phrases: string[] }[] = [
  { id: "hypothesis_variables", phrases: ["가설에 ‘왜 그렇게 생각했는지’ 까닭을 한 줄 더 써 보자.", "활동마다 같게 해야 할 조건(같은 양, 같은 기구)을 과정에 적어 보자."] },
  { id: "data", phrases: ["계산값 옆에 단위를 꼭 붙여 보자.", "자료마다 ‘알 수 있는 점’을 한 문장씩 써 보자.", "표의 값과 그래프 모양이 같은 내용을 말하는지 확인해 보자."] },
  { id: "interpretation", phrases: ["결론의 근거가 되는 값을 자료에서 골라 직접 적어 보자.", "그 값이 왜 그렇게 나왔는지 배운 개념(밀도, 녹는점 등)으로 설명해 보자.", "오차가 생긴 까닭을 실험 과정의 한 단계와 연결해 보자."] },
  { id: "reflection", phrases: ["어려웠던 점을 어떻게 해결했는지까지 적은 점이 좋아요.", "배운 내용을 생활 속 예와 연결해 보자."] },
];
