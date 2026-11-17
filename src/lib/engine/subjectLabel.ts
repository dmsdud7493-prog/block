/**
 * 측정 대상 이름 — 준비물 블록에 있는 것은 그 이름, 준비물이 아닌 대상(혼합물·용액·결정 등)은 우리말 이름.
 * 프로그램 안의 영어 이름(mixture·solution …)이 표·그래프·보고서에 그대로 보이지 않게 한다 (2026-11-17 점검).
 */
import type { AnyCatalog } from "./experiments/types";

const NON_ITEM: Record<string, string> = {
  mixture: "혼합물",
  water: "물",
  solution: "용액",
  crystal: "결정",
  filtrate: "거른 용액",
  residue: "남은 고체",
};

export function subjectLabel(catalog: AnyCatalog, id: string): string {
  return catalog.items.find((i) => i.id === id)?.label ?? NON_ITEM[id] ?? id;
}
