/**
 * 평가 유형 (CLAUDE.md 규칙 1). 계산값 입력과 예측은 형성평가:
 * 재시도 무제한, 즉시 피드백, 정답값 미노출(오류 유형만).
 */
export const CALC_ASSESSMENT = {
  type: "FORMATIVE",
  maxAttempts: null,
  showAnswerAfter: "NEVER",
} as const;

/** 교사 루브릭 채점은 제출 후 반환 시 공개되는 총괄 성격 */
export const REPORT_ASSESSMENT = {
  type: "SUMMATIVE",
  maxAttempts: 1,
  showAnswerAfter: "ON_SUBMIT",
} as const;
