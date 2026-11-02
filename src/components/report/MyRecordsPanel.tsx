"use client";
/** 내 기록 패널 (지침 6.2) — 최종 블록, 실행 기록·바꾼 변인, 예측과 비교, 계산 결과를 보며 보고서를 쓴다 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { LabState } from "@/components/lab/types";
import { renderProgram } from "@/lib/engine/dsl/render";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded border border-line bg-panel p-2 text-sm" open>
      <summary className="cursor-pointer font-semibold">{title}</summary>
      {children}
    </details>
  );
}

function Predictions({ catalog, s }: { catalog: AnyCatalog; s: LabState }) {
  const label = (t: string, c: string) => catalog.predictionTargets.find((x) => x.id === t)?.choices.find((x) => x.id === c)?.label ?? c;
  return <ul className="mt-1 space-y-1">{s.predictions.map((p) => <li key={p.target}>예상: {label(p.target, p.choice)} → {p.matched === true ? "같았음" : p.matched === false ? "달랐음" : "비교 전"}{p.rationaleAfter ? ` (${p.rationaleAfter})` : ""}</li>)}</ul>;
}

/** 계산 칸 이름 — "물의 밀도"처럼 (계산 요청에서 대상·항목을 찾는다) */
function calcName(catalog: AnyCatalog, s: LabState, key: string): string {
  const req = s.runs.flatMap((r) => r.calcRequests).find((r) => r.key === key);
  if (!req) return key.split(".")[0];
  const who = catalog.items.find((i) => i.id === req.subject)?.label ?? req.subject;
  return `${who}의 ${req.label}`;
}

export default function MyRecordsPanel({ catalog, state }: { catalog: AnyCatalog; state: LabState }) {
  const steps = renderProgram(catalog, state.program.steps);
  const calcs = Object.values(state.calc);
  return (
    <aside aria-label="내 실험 기록" className="space-y-2">
      <h2 className="font-bold">🗂 내 기록 (보고서를 쓸 때 참고해요)</h2>
      <Block title={`최종 블록 절차 (${steps.length}개)`}><ol className="mt-1 list-inside list-decimal">{steps.map((t, i) => <li key={`${i}-${t}`}>{t}</li>)}</ol></Block>
      <Block title={`실행 기록 (${state.runs.length}회)`}><ul className="mt-1">{state.runs.map((r) => <li key={r.runNo}>{r.runNo}회차 · {r.ok ? "끝까지" : "멈춤"}{r.changedVars.length ? ` · 바꾼 변인: ${r.changedVars.join(", ")}` : ""}</li>)}</ul></Block>
      {catalog.resultView?.kind === "layers" ? null : <Block title="예상과 비교"><Predictions catalog={catalog} s={state} /></Block>}
      <Block title="계산 결과"><ul className="mt-1">{calcs.map((c) => <li key={c.key}>{calcName(catalog, state, c.key)} · {c.value} {c.unit} · {c.correct ? "확인됨" : `도전 ${c.attempts}번`}</li>)}</ul></Block>
    </aside>
  );
}
