/** 계산값 오류 유형 — 클라이언트·튜터 공용 (정답값은 포함하지 않는다) */
export type ErrorType =
  | "swapped"
  | "unit"
  | "meniscus"
  | "decimal"
  | "rounding"
  | "solvent_basis"
  | "plateau"
  | "table_read"
  | "not_number"
  | "other";

/** 학생에게 보이는 안내(행동 지목·한 가지만·격려형) — 값은 말하지 않는다 */
export const ERROR_HINTS: Record<ErrorType, string> = {
  swapped: "나누는 순서를 다시 확인해 볼까요? 무엇을 무엇으로 나누는지 표의 열 이름을 보세요.",
  unit: "숫자는 거의 맞았어요. 단위를 다시 골라 볼까요?",
  meniscus: "부피 칸의 값을 다시 볼까요? 눈금은 눈높이에서, 액체 표면의 가장 낮은 곳을 읽어요.",
  decimal: "소수점 위치를 확인해 볼까요? 대략 어느 정도 크기의 값이 나와야 할지 어림해 보세요.",
  rounding: "거의 다 왔어요. 계산을 한 번 더 하고 소수 둘째 자리까지 적어 볼까요?",
  solvent_basis: "용해도는 물 100 g 기준이에요. 실험에 쓴 물의 양으로 환산했는지 확인해 볼까요?",
  plateau: "그래프에서 온도가 한동안 변하지 않는 평평한 구간을 찾아 그 온도를 읽어 볼까요?",
  table_read: "용해도 표에서 식힌 온도의 값을 읽었는지 확인해 볼까요?",
  not_number: "숫자로 입력해 주세요.",
  other: "아직 아니에요. 표의 값을 하나씩 짚어 가며 다시 계산해 볼까요?",
};
