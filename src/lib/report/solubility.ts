/**
 * 용해도 실험의 온도–녹은 양 점 — 실험실 그래프(SolubilityChart)와 보고서 자료가 함께 쓴다.
 * 녹은 양은 '넣은 총량 − 녹지 않고 남은 양'(내가 넣은 물 기준). 물 100 g 환산은 학생이 계산하는 값이라 그리지 않는다(지침 5.3).
 */
import type { RunRecord } from "@/components/lab/types";

export interface DissolvedRecord { subject: string; trial: number; value: number }
export interface SolubilityGroup { subject: string; points: { x: number; y: number }[] }

/** 회차마다 녹은 양. 예전 기록(녹은 양을 그대로 측정값으로 남김)도 읽는다 */
export function dissolvedRecords(run: RunRecord): DissolvedRecord[] {
  const old = run.measurements.filter((m) => /^dissolved\.[^.]+\.t\d+$/.test(m.key)).map((m) => ({ subject: m.subject, trial: m.trial, value: m.value }));
  const now = run.measurements.filter((m) => /^residue\.[^.]+\.t\d+$/.test(m.key)).flatMap((r) => {
    const added = run.measurements.find((m) => m.key === `added.${r.subject}.t${r.trial}`);
    return added ? [{ subject: r.subject, trial: r.trial, value: Math.round((added.value - r.value) * 100) / 100 }] : [];
  });
  return [...old, ...now];
}

/** 한 실행의 물질별 (온도, 녹은 양) 점 — trials를 주면 그 회차만 */
export function solubilityPoints(run: RunRecord, trials?: number[]): SolubilityGroup[] {
  const dissolved = dissolvedRecords(run).filter((d) => !trials || trials.includes(d.trial));
  const subjects = [...new Set(dissolved.map((d) => d.subject))];
  return subjects.map((subject) => ({
    subject,
    points: dissolved
      .filter((d) => d.subject === subject)
      .flatMap((d) => {
        const t = run.measurements.find((m) => m.key === `temp.${subject}.t${d.trial}`);
        return t ? [{ x: t.value, y: d.value }] : [];
      })
      .sort((a, b) => a.x - b.x),
  }));
}

const temps = (g: SolubilityGroup) => new Set(g.points.map((p) => p.x)).size;

/** 여러 실행 가운데 물질마다 온도를 가장 여러 가지로 잰 실행의 점(같으면 나중 실행) — 미션 ③ 뒤에 다른 실행을 해도 온도 비교 그래프가 남는다 */
export function bestSolubilityPoints(runs: RunRecord[]): SolubilityGroup[] {
  const all = runs.filter((r) => r.ok).flatMap((r) => solubilityPoints(r).filter((g) => g.points.length > 0));
  const subjects = [...new Set(all.map((g) => g.subject))];
  return subjects.map((s) => all.filter((g) => g.subject === s).reduce((a, g) => (temps(g) >= temps(a) ? g : a)));
}
