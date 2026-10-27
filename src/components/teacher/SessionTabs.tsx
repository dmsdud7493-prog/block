"use client";
/**
 * 학생 상세 (T-04 → 학생 클릭): 블록 / 실행·그래프 / 예상 / AI 대화 탭 (지침 5.1 대화 열람, R6).
 * 교사는 자기 반 학생의 대화를 모두 볼 수 있고, 학생에게는 이 사실이 튜터 창에 안내되어 있다.
 */
import { useRef, useState } from "react";
import type { SessionDetail } from "@/lib/teacherTypes";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { RunRecord } from "@/components/lab/types";
import { getCatalog } from "@/lib/engine/experiments";
import { renderProgram } from "@/lib/engine/dsl/render";
import { fmtNum } from "@/lib/engine/format";
import ResultChart from "@/components/data/ResultChart";
import { ERROR_TYPE_LABEL } from "@/lib/events/cards";

export type TabId = "blocks" | "runs" | "predictions" | "chat";
const TABS: { id: TabId; label: string }[] = [
  { id: "blocks", label: "🧩 블록" }, { id: "runs", label: "📈 실행·그래프" }, { id: "predictions", label: "🔮 예상" }, { id: "chat", label: "💬 AI 대화" },
];

function Blocks({ d, c }: { d: SessionDetail; c: AnyCatalog }) {
  if (!d.program) return <p className="text-muted">아직 저장된 블록이 없어요.</p>;
  const opt = (id: string | null) => c.variableOptions.find((o) => o.id === id)?.label ?? "(빈칸)";
  return (
    <div className="space-y-2">
      <ul className="text-sm">{d.program.variables.map((v) => <li key={v.blockId}>{v.role}: {opt(v.optionId)}{v.rationale ? ` — “${v.rationale}”` : ""}</li>)}</ul>
      <ol className="list-decimal space-y-1 pl-6 text-sm">{renderProgram(c, d.program.steps).map((line, i) => <li key={i}>{line}</li>)}</ol>
    </div>
  );
}

const toRecord = (r: SessionDetail["runs"][number]): RunRecord => ({
  runNo: r.run_no, ok: r.ok, frames: [], measurements: r.measurements, calcRequests: r.calc_requests, series: r.series,
  diagnostics: r.diagnostics, program: r.program, changedVars: r.changed_vars,
});

function Runs({ d, c }: { d: SessionDetail; c: AnyCatalog }) {
  if (d.runs.length === 0) return <p className="text-muted">아직 실행 기록이 없어요.</p>;
  return (
    <div className="space-y-3">
      <ul className="space-y-1 text-sm">{d.runs.map((r) => <li key={r.run_no}><strong>{r.run_no}회차</strong> {r.ok ? "✅ 성공" : `⚠️ 멈춤: ${r.diagnostics.find((x) => x.severity === "error")?.message ?? ""}`}{r.changed_vars.length ? ` · 바꾼 변인: ${r.changed_vars.join(", ")}` : ""}</li>)}</ul>
      <ResultChart catalog={c} runs={d.runs.map(toRecord)} />
      <table className="w-full text-sm">
        <caption className="text-left font-semibold">계산값 입력 기록 (시도 순서대로)</caption>
        <thead><tr><th scope="col" className="text-left">칸</th><th scope="col" className="text-left">입력</th><th scope="col" className="text-left">결과</th></tr></thead>
        <tbody>{d.calc.map((m, i) => <tr key={i}><td>{m.key}</td><td className="tabular-nums">{m.value === null ? "—" : fmtNum(Number(m.value))} {m.unit}</td><td>{m.is_correct ? "✓ 맞음" : `다시 시도 (${ERROR_TYPE_LABEL[m.error_type ?? "other"] ?? m.error_type})`}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Predictions({ d }: { d: SessionDetail }) {
  if (d.predictions.length === 0) return <p className="text-muted">아직 예상을 적지 않았어요.</p>;
  return <ul className="space-y-2 text-sm">{d.predictions.map((p) => <li key={p.target} className="rounded border border-line p-2"><strong>{p.target}</strong>: {p.choice} — “{p.rationale}” (힌트 {p.hints_used}개){p.matched === null ? "" : ` → 결과와 ${p.matched ? "같았음" : "달랐음"}: “${p.rationale_after ?? ""}”`}</li>)}</ul>;
}

function Chat({ d }: { d: SessionDetail }) {
  if (d.chat.length === 0) return <p className="text-muted">AI 도우미와 나눈 대화가 없어요.</p>;
  const flagged = d.chat.filter((m) => m.flagged).length;
  return (
    <div className="space-y-2">
      {flagged ? <p role="note" className="rounded bg-red-50 p-2 text-sm text-err">🚩 확인이 필요한 메시지 {flagged}개 — 빨간 테두리로 표시했어요.</p> : null}
      <ol className="space-y-1 text-sm">{d.chat.map((m, i) => <li key={i} className={`rounded p-2 ${m.role === "user" ? "bg-sky-50" : "bg-slate-50"} ${m.flagged ? "border-2 border-err" : ""}`}><span className="font-semibold">{m.role === "user" ? "학생" : "AI"}</span> <span className="text-xs text-muted">{new Date(m.created_at).toLocaleTimeString("ko-KR")}</span><p className="whitespace-pre-wrap">{m.content}</p></li>)}</ol>
    </div>
  );
}

export default function SessionTabs({ detail, initial = "blocks" }: { detail: SessionDetail; initial?: TabId }) {
  const [tab, setTab] = useState<TabId>(initial);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const catalog = getCatalog(detail.slug);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const next = TABS[(i + d + TABS.length) % TABS.length].id;
    setTab(next);
    refs.current[next]?.focus();
  };
  if (!catalog) return <p>알 수 없는 실험이에요.</p>;
  return (
    <div>
      <div role="tablist" aria-label="학생 기록" className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t, i) => <button key={t.id} ref={(el) => { refs.current[t.id] = el; }} id={`tab-${t.id}`} role="tab" type="button" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} onKeyDown={(e) => onKey(e, i)} onClick={() => setTab(t.id)} className={`tap rounded-t px-3 font-semibold ${tab === t.id ? "bg-brand text-white" : "bg-panel"}`}>{t.label}</button>)}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="rounded-b border border-t-0 border-line bg-panel p-3">
        {tab === "blocks" ? <Blocks d={detail} c={catalog} /> : null}
        {tab === "runs" ? <Runs d={detail} c={catalog} /> : null}
        {tab === "predictions" ? <Predictions d={detail} /> : null}
        {tab === "chat" ? <Chat d={detail} /> : null}
      </div>
    </div>
  );
}
