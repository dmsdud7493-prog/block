/**
 * 여러 번 실험한 결과 비교 표 — 성공한 실행(회차)마다 한 줄: 측정값 + 학생이 맞힌 계산값, 그리고 처음 실행과의 차이.
 * 실험실 결과 칸(RunCompare)과 보고서 자료가 같은 표를 쓴다. 정답값은 쓰지 않는다(규칙 3).
 */
import type { CalcEntry, RunRecord } from "@/components/lab/types";
import { fmtMeasure, fmtNum } from "@/lib/engine/format";

export interface CompareTable { columns: string[]; rows: string[][]; /** 회차마다 같았던 값(표에서 빼고 한 줄로) — "물의 질량 100 g" */ same: string[] }

/** 비교의 기준이 되는 측정값 — 마지막에 잰 결과값(말린 결정의 질량) */
const MAIN = /^crystal_mass\./;

interface Cell { col: string; value: string; num: number; main: boolean }

function cellsOf(run: RunRecord, calc: Record<string, CalcEntry>): Cell[] {
  const first = Math.min(...run.measurements.map((m) => m.trial), ...run.calcRequests.map((c) => c.trial));
  const measured = run.measurements.filter((m) => m.trial === first).map((m) => ({ col: `${m.label}(${m.unit})`, value: fmtMeasure(m), num: m.value, main: MAIN.test(m.key) }));
  const solved = run.calcRequests.filter((c) => c.trial === first && calc[c.key]?.correct && calc[c.key].runNo === run.runNo).map((c) => ({ col: `${c.label}(${calc[c.key].unit})`, value: calc[c.key].value, num: Number(calc[c.key].value), main: false }));
  return [...measured, ...solved];
}

const signed = (d: number) => (d === 0 ? "0" : `${d > 0 ? "+" : "−"}${fmtNum(Math.abs(Math.round(d * 100) / 100))}`);

const unitOut = (col: string, value: string) => col.replace(/\(([^()]*)\)$/, ` ${value} $1`);

export function compareRuns(runs: RunRecord[], calc: Record<string, CalcEntry>): CompareTable {
  const ok = runs.filter((r) => r.ok && r.measurements.length > 0).slice(-8);
  const all = ok.map((r) => cellsOf(r, calc));
  const every = [...new Set(all.flatMap((cs) => cs.map((c) => c.col)))];
  const mainCol = all.flatMap((cs) => cs.filter((c) => c.main).map((c) => c.col))[0];
  const valueIn = (cs: Cell[], col: string) => cs.find((c) => c.col === col)?.value ?? "—";
  // 회차마다 같은 값(같게 한 조건)은 표에서 빼고 한 줄로 — 좁은 화면에서도 달라진 값이 한눈에 보이게
  const constant = (col: string) => all.length > 1 && col !== mainCol && new Set(all.map((cs) => valueIn(cs, col))).size === 1;
  const cols = every.filter((col) => !constant(col)).slice(0, 6);
  const base = all[0]?.find((c) => c.col === mainCol)?.num;
  const diff = (cs: Cell[], i: number) => {
    const v = cs.find((c) => c.col === mainCol)?.num;
    return i === 0 ? "기준" : v === undefined || base === undefined ? "—" : signed(v - base);
  };
  const rows = all.map((cs, i) => [`${i + 1}번째`, ...cols.map((col) => valueIn(cs, col)), ...(mainCol ? [diff(cs, i)] : [])]);
  return { columns: ["실험", ...cols, ...(mainCol ? ["1번째와의 차이(g)"] : [])], rows, same: every.filter(constant).map((col) => unitOut(col, valueIn(all[0], col))) };
}
