/**
 * 고쳐서 다시 낸 보고서에서 학생이 고친 칸 — 교사가 다시 채점할 때 어디를 보면 되는지 알려 준다 (2026-11-18 점검).
 */
import type { ReportContent } from "./template";

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

const INTERP: [keyof ReportContent["interpretation"], string][] = [
  ["hypothesisVerdict", "정리 1: 예상이 맞았는지"], ["evidence", "정리 1: 그렇게 생각한 까닭"], ["trend", "정리 2: 알게 된 것"],
  ["errorSources", "정리 2: 오차"], ["improvements", "정리 2: 다음에 더 잘하려면"],
];
const REFL: [keyof ReportContent["reflection"], string][] = [["hardest", "성찰: 어려웠던 점"], ["curious", "성찰: 더 알아보고 싶은 점"], ["realLife", "성찰: 생활 속 연결"]];

/** 바뀐 칸 이름 목록(보고서 순서) */
export function changedSections(prev: ReportContent, cur: ReportContent): string[] {
  const head: [keyof ReportContent, string][] = [["title", "탐구 제목"], ["goal", "목표"], ["hypothesis", "가설"], ["materials", "준비물"]];
  const n = Math.max(prev.activities.length, cur.activities.length, prev.data.length, cur.data.length);
  const idx = Array.from({ length: n }, (_, i) => i);
  return [
    ...head.filter(([k]) => !same(prev[k], cur[k])).map(([, label]) => label),
    ...idx.filter((i) => !same(prev.activities[i]?.steps, cur.activities[i]?.steps)).map((i) => `과정: 활동 ${i + 1}`),
    ...idx.filter((i) => !same(prev.data[i]?.note, cur.data[i]?.note)).map((i) => `자료 ${i + 1}에서 알 수 있는 점`),
    ...INTERP.filter(([k]) => !same(prev.interpretation[k], cur.interpretation[k])).map(([, label]) => label),
    ...REFL.filter(([k]) => !same(prev.reflection[k], cur.reflection[k])).map(([, label]) => label),
  ];
}
