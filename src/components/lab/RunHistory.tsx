/** 실행 기록 (지침 3.4) — 이전 시도와 바뀐 변인을 보존해 비교한다 */
import type { RunRecord } from "./types";

function RunItem({ r }: { r: RunRecord }) {
  const stop = r.diagnostics.find((d) => d.severity === "error");
  return (
    <li className="text-sm">
      <strong>{r.runNo}회차</strong> · 블록 {r.program.steps.length}개 · {r.ok ? "끝까지 실행" : `멈춤: ${stop?.message ?? ""}`}
      {r.changedVars.length ? <span className="text-muted"> · 바꾼 변인: {r.changedVars.join(", ")}</span> : null}
    </li>
  );
}

export default function RunHistory({ runs }: { runs: RunRecord[] }) {
  if (runs.length === 0) return null;
  return (
    <section aria-labelledby="hist-title" className="rounded border border-line bg-panel p-2">
      <h3 id="hist-title" className="font-bold">🗂 실행 기록</h3>
      <ol className="mt-1 space-y-1">{runs.map((r) => <RunItem key={r.runNo} r={r} />)}</ol>
    </section>
  );
}
