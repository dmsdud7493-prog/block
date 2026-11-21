/**
 * 보고서 '과정'의 순서 번호 통일 (2026-11-21).
 * 예전에는 ➊~➓ 다음이 "11."이라 11번째부터 모양이 달랐다. 원 번호 글자(➊·①·⑪…)는 기기 글꼴에 따라 서로 다른 글꼴에서
 * 나와 크기·굵기가 달라지므로, 글에는 "1." "2." … "11."로만 쓰고 읽기·인쇄 화면에서 같은 모양의 동그라미 번호로 그린다(StepLines).
 */
export const stepMark = (i: number) => `${i + 1}.`;

const OLD = "➊➋➌➍➎➏➐➑➒➓";
const CIRCLED = /^[①-⑳]/;

function unifyLine(line: string): string {
  const head = line.charAt(0);
  if (head && OLD.includes(head)) return `${OLD.indexOf(head) + 1}.${line.slice(1)}`;
  return CIRCLED.test(line) ? `${head.codePointAt(0)! - 0x245f}.${line.slice(1)}` : line;
}

/** 예전에 저장된 과정 글(➊… 11.)의 번호를 "1." … "11."로 맞춘다. 다른 글자는 건드리지 않는다 */
export const unifyMarks = (text: string): string => text.split("\n").map(unifyLine).join("\n");

export const unifyActivities = <T extends { steps: string }>(acts: T[]): T[] => acts.map((a) => ({ ...a, steps: unifyMarks(a.steps) }));

/** 한 줄을 번호와 내용으로 나눈다 — "3. 물을 붓는다" → { n: 3, text: "물을 붓는다" }. 번호가 없으면 n은 null */
export function splitStep(line: string): { n: number | null; text: string } {
  const m = /^(\d{1,2})\.\s+(.*)$/.exec(unifyLine(line));
  return m ? { n: Number(m[1]), text: m[2] } : { n: null, text: line };
}
