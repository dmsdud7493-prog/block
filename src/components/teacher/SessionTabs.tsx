"use client";
/**
 * 학생 상세 (T-04 → 학생 클릭): 블록(회차별) / 실행·계산 / 예상(질문·답) / 보고서(작성 중) / AI 대화 탭 (지침 5.1 대화 열람, R6).
 * 예상·계산값 입력은 형성평가(FORMATIVE, 재시도 무제한)라 점수 없이 기록만 보여 준다. 교사는 자기 반 학생의 대화를 모두 볼 수 있고, 학생에게는 이 사실이 튜터 창에 안내되어 있다.
 */
import { useRef, useState } from "react";
import type { RunLine, SessionDetail } from "@/lib/teacherTypes";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { RunRecord } from "@/components/lab/types";
import { getCatalog } from "@/lib/engine/experiments";
import { renderProgram } from "@/lib/engine/dsl/render";
import { fmtNum } from "@/lib/engine/format";
import ResultChart from "@/components/data/ResultChart";
import { ERROR_TYPE_LABEL } from "@/lib/events/cards";
import type { Program } from "@/lib/engine/types";
import ReportReadOnly from "./ReportReadOnly";
import { predictionText } from "@/lib/events/predictionText";

export type TabId = "blocks" | "runs" | "predictions" | "report" | "chat";
const TABS: { id: TabId; label: string }[] = [
  { id: "blocks", label: "🧩 블록" }, { id: "runs", label: "📈 실행·계산" }, { id: "predictions", label: "🔮 예상" }, { id: "report", label: "📝 보고서" }, { id: "chat", label: "💬 AI 대화" },
];

const itemLabel = (c: AnyCatalog, id: string) => c.items.find((i) => i.id === id)?.label ?? id;
const varLabel = (c: AnyCatalog, id: string) => c.variableOptions.find((o) => o.id === id)?.label ?? id;

/** 블록을 학생 화면과 같은 한국어 문장으로 */
function Steps({ program, c }: { program: Program; c: AnyCatalog }) {
  const lines = renderProgram(c, program.steps);
  if (lines.length === 0) return <p className="text-sm text-muted">비어 있어요.</p>;
  return <ol className="list-decimal space-y-1 pl-6 text-sm">{lines.map((line, i) => <li key={i}>{line}</li>)}</ol>;
}

/** 이 실행에서 다룬 물질 — 계산 요청 대상, 없으면 측정한 대상 */
function subjectsOf(r: RunLine, c: AnyCatalog): string {
  const ids = r.calc_requests.length ? r.calc_requests.map((q) => q.subject) : r.measurements.map((m) => m.subject);
  return [...new Set(ids)].map((id) => itemLabel(c, id)).join(", ");
}

function RunBlocks({ r, c, open }: { r: RunLine; c: AnyCatalog; open: boolean }) {
  return (
    <details open={open} className="rounded border border-line bg-white p-2">
      <summary className="cursor-pointer text-sm font-semibold">{r.run_no}회차 실행 {r.ok ? "✅ 끝까지 실행" : "⚠️ 중간에 멈춤"} · 다룬 물질: {subjectsOf(r, c) || "—"} <span className="font-normal text-muted">({new Date(r.created_at).toLocaleTimeString("ko-KR")})</span></summary>
      <div className="mt-1"><Steps program={r.program} c={c} /></div>
    </details>
  );
}

/** 블록 — 지금 조립판 + 실행한 회차마다의 블록(미션을 넘어가면 조립판이 비워져도 학생이 완성한 블록이 남는다) */
function Blocks({ d, c }: { d: SessionDetail; c: AnyCatalog }) {
  const now = d.program && d.program.steps.length > 0 ? d.program : null;
  return (
    <div className="space-y-3">
      <section className="space-y-1">
        <h3 className="font-semibold">지금 조립판</h3>
        {now ? <Steps program={now} c={c} /> : <p className="text-sm text-muted">비어 있어요{d.runs.length ? " — 미션을 마치고 다음 미션을 준비하는 중이에요. 완성한 블록은 아래 실행 기록에 있어요." : "."}</p>}
      </section>
      {[...d.runs].reverse().map((r) => <RunBlocks key={r.run_no} r={r} c={c} open={r.run_no === d.runs.length} />)}
    </div>
  );
}

const toRecord = (r: SessionDetail["runs"][number]): RunRecord => ({
  runNo: r.run_no, ok: r.ok, frames: [], measurements: r.measurements, calcRequests: r.calc_requests, series: r.series,
  diagnostics: r.diagnostics, program: r.program, changedVars: r.changed_vars,
});

/** 계산 칸 이름 — 'density.water.t1' → '물 1회 · 밀도' (학생 표와 같은 말) */
function calcLabel(d: SessionDetail, c: AnyCatalog, key: string): string {
  const req = d.runs.flatMap((r) => r.calc_requests).find((q) => q.key === key);
  return req ? `${itemLabel(c, req.subject)} ${req.trial}회 · ${req.label}` : key;
}

function Runs({ d, c }: { d: SessionDetail; c: AnyCatalog }) {
  if (d.runs.length === 0) return <p className="text-muted">아직 실행 기록이 없어요.</p>;
  return (
    <div className="space-y-3">
      <ul className="space-y-1 text-sm">{d.runs.map((r) => <li key={r.run_no}><strong>{r.run_no}회차</strong> {r.ok ? "✅ 성공" : `⚠️ 멈춤: ${r.diagnostics.find((x) => x.severity === "error")?.message ?? ""}`} · 다룬 물질: {subjectsOf(r, c) || "—"}{r.changed_vars.length ? ` · 바꾼 조건: ${r.changed_vars.map((v) => varLabel(c, v)).join(", ")}` : ""}</li>)}</ul>
      <ResultChart catalog={c} runs={d.runs.map(toRecord)} />
      <table className="w-full text-sm">
        <caption className="text-left font-semibold">학생이 입력한 계산값 (시도 순서대로)</caption>
        <thead><tr><th scope="col" className="text-left">계산한 것</th><th scope="col" className="text-left">학생 입력</th><th scope="col" className="text-left">결과</th></tr></thead>
        <tbody>{d.calc.map((m, i) => <tr key={i}><td>{calcLabel(d, c, m.key)}</td><td className="tabular-nums">{m.value === null ? "—" : fmtNum(Number(m.value))} {m.unit}</td><td>{m.is_correct ? "✓ 맞음" : `다시 시도 (${ERROR_TYPE_LABEL[m.error_type ?? "other"] ?? "기타"})`}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** 예상 — 어떤 질문에 무엇을 고르고 왜 그렇게 생각했는지, 결과를 본 뒤 무엇이라고 했는지 */
function Prediction({ p, c }: { p: SessionDetail["predictions"][number]; c: AnyCatalog }) {
  const { ask, answer } = predictionText(c, p.target, p.choice);
  return (
    <li className="space-y-1 rounded border border-line bg-white p-2 text-sm">
      <p><span className="font-semibold text-brand">질문</span> {ask}</p>
      <p><span className="font-semibold">학생의 예상</span> {answer}</p>
      <p><span className="font-semibold">그렇게 생각한 이유</span> “{p.rationale}”</p>
      <p className="text-muted">예상할 때 본 힌트 {p.hints_used}개</p>
      {p.matched === null ? null : <p><span className="font-semibold">결과를 본 뒤</span> 예상과 {p.matched ? "같았어요" : "달랐어요"}{p.rationale_after ? ` — “${p.rationale_after}”` : ""}</p>}
    </li>
  );
}

function Predictions({ d, c }: { d: SessionDetail; c: AnyCatalog }) {
  if (d.predictions.length === 0) return <p className="text-muted">아직 예상을 적지 않았어요.</p>;
  return <ul className="space-y-2">{d.predictions.map((p) => <Prediction key={p.target} p={p} c={c} />)}</ul>;
}

/** 보고서 — 제출 전에도 작성 중인 내용을 읽기만 할 수 있다(채점은 제출 뒤) */
function Report({ d }: { d: SessionDetail }) {
  if (!d.report) return <p className="text-muted">아직 보고서를 쓰기 시작하지 않았어요. 보고서는 오늘의 미션을 모두 마치면 열려요.</p>;
  return (
    <div className="space-y-2">
      <p role="note" className="rounded bg-amber-50 p-2 text-sm">{d.submissionId ? "제출한 보고서예요. 채점은 위의 '보고서 채점하기'에서 해요." : "✏️ 학생이 아직 쓰고 있는 보고서예요(제출 전). 채점은 학생이 제출한 뒤에 할 수 있어요."} 마지막 저장 {new Date(d.report.updatedAt).toLocaleString("ko-KR")}</p>
      <ReportReadOnly content={d.report.content} aiAssisted={d.report.aiAssisted} />
    </div>
  );
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
        {tab === "predictions" ? <Predictions d={detail} c={catalog} /> : null}
        {tab === "report" ? <Report d={detail} /> : null}
        {tab === "chat" ? <Chat d={detail} /> : null}
      </div>
    </div>
  );
}
