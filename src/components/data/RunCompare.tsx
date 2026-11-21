"use client";
/**
 * 여러 번 실험한 결과 비교 표 (용해도 차를 이용한 분리, 2026-11-21) — 그래프 대신 표로 회차마다 값을 나란히 놓고 오차를 살핀다(지침 3.4).
 * 측정값과 학생이 맞힌 계산값만 쓴다(정답값 없음, 규칙 3).
 */
import type { CalcEntry, RunRecord } from "@/components/lab/types";
import { compareRuns, type CompareTable } from "@/lib/report/compare";

function Grid({ t }: { t: CompareTable }) {
  return (
    <div className="mt-1 overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead className="border-b border-line"><tr>{t.columns.map((c) => <th key={c} scope="col" className="px-2 py-1 text-center">{c}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{t.rows.map((r) => <tr key={r[0]}>{r.map((v, i) => (i === 0 ? <th key={i} scope="row" className="px-2 py-1 text-center">{v}</th> : <td key={i} className="px-2 py-1 text-center">{v}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function RunCompare({ runs, calc }: { runs: RunRecord[]; calc: Record<string, CalcEntry> }) {
  const t = compareRuns(runs, calc);
  if (t.rows.length < 2) {
    return <p className="rounded-xl border-2 border-dashed border-[#4c97ff] bg-[#f4f8ff] p-3 text-sm font-semibold">🔁 같은 실험을 한 번 더 실행하면, 회차마다 값을 나란히 놓은 비교 표가 생겨요. 값이 얼마나 다른지(오차) 살펴볼 수 있어요.</p>;
  }
  return (
    <figure aria-label="여러 번 실험한 결과 비교" className="rounded-lg border border-line bg-panel p-2">
      <figcaption className="font-bold">📋 여러 번 실험한 결과 비교 <span className="text-sm font-normal text-muted">— 같은 실험인데 값이 얼마나 다른가요?</span></figcaption>
      <Grid t={t} />
      {t.same.length ? <p className="mt-1 text-sm text-muted">회차마다 같게 한 값: {t.same.join(" · ")}</p> : null}
      <p className="mt-1 text-sm">🤔 회차마다 값이 조금씩 다른 까닭은 무엇일까요? 보고서의 ‘값이 조금씩 달라진 까닭(오차)’에 써 봐요.</p>
    </figure>
  );
}
