"use client";
/** 실험 점검 패널 — 누락·모순을 목록과 aria-live 요약으로 (지침 2.3, KWCAG) */
import type { Diagnostic } from "@/lib/engine/types";

const ICON: Record<Diagnostic["severity"], string> = { error: "⛔", warn: "⚠️", info: "ℹ️" };
const WORD: Record<Diagnostic["severity"], string> = { error: "고칠 곳", warn: "확인할 곳", info: "안내" };

function summary(diags: Diagnostic[]): string {
  if (diags.length === 0) return "점검 결과: 지금은 걸리는 곳이 없어요.";
  const errors = diags.filter((d) => d.severity === "error").length;
  const warns = diags.filter((d) => d.severity === "warn").length;
  return `점검 결과: 고칠 곳 ${errors}개, 확인할 곳 ${warns}개`;
}

function DiagItem({ d, onFocusBlock }: { d: Diagnostic; onFocusBlock?: (id: string) => void }) {
  return (
    <li>
      <button type="button" className="w-full rounded px-1 text-left hover:bg-white" onClick={() => d.blockId && onFocusBlock?.(d.blockId)}>
        <span aria-hidden="true">{ICON[d.severity]} </span><span className="sr-only">{WORD[d.severity]}: </span>{d.message}
      </button>
    </li>
  );
}

export default function CheckPanel({ diagnostics, onFocusBlock }: { diagnostics: Diagnostic[]; onFocusBlock?: (id: string) => void }) {
  return (
    <section aria-labelledby="check-title" className={`rounded-xl border-2 p-2.5 ${diagnostics.length ? "border-[#ffd27a] bg-[#fffaf0]" : "border-[#bfead9] bg-[#f1fbf6]"}`}>
      <h3 id="check-title" className="text-sm font-extrabold text-ink">🔎 실험 점검 {diagnostics.length === 0 ? <span aria-hidden="true">👍</span> : null}</h3>
      <p className="text-sm font-semibold text-muted" aria-live="polite">{summary(diagnostics)}</p>
      <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-sm">
        {diagnostics.map((d, i) => <DiagItem key={`${d.code}-${d.blockId}-${i}`} d={d} onFocusBlock={onFocusBlock} />)}
      </ul>
    </section>
  );
}
