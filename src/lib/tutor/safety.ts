/**
 * 미성년자 안전 (R7·R8): 위험 신호 감지 → 고정 안내 + 교사 플래그, 개인정보 가림(R4).
 */
const RISK = [
  { re: /(죽고\s*싶|자살|자해|목숨을?\s*끊|사라지고\s*싶|죽어\s*버리|살기\s*싫)/, kind: "self_harm" },
  { re: /(때렸|맞았|폭력|괴롭히|괴롭혀|괴롭힘|왕따|따돌림|협박|칼로)/, kind: "violence_bullying" },
] as const;

export function detectRisk(text: string): string | null {
  return RISK.find((r) => r.re.test(text))?.kind ?? null;
}

export const SAFETY_REPLY =
  "그런 마음이나 일이 있었다니 많이 힘들었겠어요. 지금 바로 선생님이나 믿을 수 있는 어른에게 이야기해 주세요. " +
  "혼자 견디지 않아도 돼요. 급할 때는 자살예방 상담전화 109, 청소년 상담 1388에 전화하거나 문자할 수 있어요.";

const PII = [
  /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, // 휴대전화
  /[\w.+-]+@[\w-]+\.[\w.]+/g, // 이메일
  /\d{6}[-\s]?[1-4]\d{6}/g, // 주민등록번호 형태
];

export function redactPII(text: string): { text: string; redacted: boolean } {
  const out = PII.reduce((acc, re) => acc.replace(re, "[개인정보 가림]"), text);
  return { text: out, redacted: out !== text };
}

/**
 * 정답 누설 검사 (지침 5.4): 아직 맞히지 않은 계산 칸의 기대값과 같은 숫자가 응답에 있으면 true.
 * 0~3 사이 단위 없는 정수("1단계", "2개")는 오탐을 막기 위해 무시한다.
 */
export function leaksAnswer(reply: string, expected: number[]): boolean {
  const tokens = [...reply.matchAll(/(\d+(?:\.\d+)?)\s*(g\/mL|g\/cm|℃|°C|도|g)?/g)];
  return tokens.some(([, num, unit]) => {
    const v = Number(num);
    const trivial = !unit && !num.includes(".") && v <= 3;
    if (trivial) return false;
    return expected.some((e) => Number.isFinite(e) && Math.abs(v - e) <= Math.max(0.02, Math.abs(e) * 0.03));
  });
}
