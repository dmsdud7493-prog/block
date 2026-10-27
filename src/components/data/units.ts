/** 계산 칸 단위 선택지 — 단위 실수(unit)도 진단할 수 있게 헷갈리는 단위를 함께 보여 준다 */
const OPTIONS: Record<string, string[]> = {
  "g/mL": ["g/mL", "mL/g", "g"],
  "°C": ["°C", "K", "℉"],
  "g/물 100 g": ["g/물 100 g", "g", "g/mL"],
  g: ["g", "g/물 100 g"],
};

/** 정답 단위가 항상 첫 칸에 있지 않도록 key로 고정 순서를 섞는다 */
export function unitOptions(unit: string, key: string): string[] {
  const list = OPTIONS[unit] ?? [unit];
  const shift = [...key].reduce((a, c) => a + c.charCodeAt(0), 0) % list.length;
  return [...list.slice(shift), ...list.slice(0, shift)];
}
