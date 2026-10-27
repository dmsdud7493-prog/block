/** 숫자 반올림·표시와 한국어 조사 처리 */
export const round1 = (v: number): number => Math.round(v * 10) / 10;
export const round2 = (v: number): number => Math.round(v * 100) / 100;

export function fmtNum(v: number): string {
  const r = round1(v);
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** "황산 구리(II)"처럼 끝 괄호 표기는 괄호 앞 글자로 받침을 판단한다 */
function stripTrailingParen(word: string): string {
  return word.trim().replace(/\([^()]*\)$/, "");
}

function hasFinalConsonant(word: string): boolean | null {
  const last = stripTrailingParen(word).slice(-1);
  if (!last) return null;
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(last)) return "013678".includes(last);
  if (/[a-zA-Z]/.test(last)) return /[lmnr]/i.test(last);
  return null;
}

function hasRieulFinal(word: string): boolean {
  const code = stripTrailingParen(word).slice(-1).charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
}

const PAIRS: Record<string, [string, string]> = {
  "을(를)": ["을", "를"],
  "이(가)": ["이", "가"],
  "은(는)": ["은", "는"],
  "과(와)": ["과", "와"],
};

/** "물을(를)" → "물을", "눈금실린더을(를)" → "눈금실린더를", "(으)로" 처리 */
export function fixJosa(text: string): string {
  const withPairs = Object.entries(PAIRS).reduce(
    (acc, [pat, [withC, withoutC]]) =>
      acc.replace(new RegExp(`(\\S+?)${pat.replace(/[()]/g, "\\$&")}`, "g"), (_m, w: string) => {
        const f = hasFinalConsonant(w);
        return w + (f === null ? pat : f ? withC : withoutC);
      }),
    text,
  );
  return withPairs.replace(/(\S+?)\(으\)로/g, (_m, w: string) => {
    const f = hasFinalConsonant(w);
    if (f === null) return `${w}(으)로`;
    return w + (f && !hasRieulFinal(w) ? "으로" : "로");
  });
}
