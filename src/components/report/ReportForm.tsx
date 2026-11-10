"use client";
/**
 * 탐구 보고서 — 교과서 탐구 활동지 모양 (ADR-P20, 지침 6.1·6.2·6.3·6.4).
 * 왼쪽 칸 이름(✤ 탐구 제목·목표·가설·준비물·과정·자료 해석·정리) + 오른쪽 내용.
 * 과정은 활동 1, 2…, 자료 해석은 자료 1, 2…, 정리는 결과 해석 → 결론 정리 → 성찰.
 * readOnly면(제출 뒤·교사 화면) 같은 모양으로 쓴 글만 보여 준다. aiFlags는 학생이 AI 도움을 받았다고 표시한 칸.
 */
import { SECTIONS, type ReportContent } from "@/lib/report/template";
import SectionField from "./SectionField";
import ResultsTable from "./ResultsTable";
import SeriesChart from "./SeriesChart";
import ReflectionForm from "./ReflectionForm";
import type { Updater } from "./useReport";

interface Props { content: ReportContent; update: (fn: Updater) => void; readOnly: boolean; onFocusSection: (title: string) => void; aiFlags?: string[] }

const sec = (id: string) => SECTIONS.find((s) => s.id === id)!;
type SimpleKey = "title" | "goal" | "hypothesis" | "materials";

/** 활동지 한 줄 — 왼쪽 칸 이름, 오른쪽 내용 */
function SheetRow({ id, p, children }: { id: string; p: Props; children: React.ReactNode }) {
  const s = sec(id);
  const ai = p.aiFlags?.includes(id);
  return (
    <section aria-labelledby={`sheet-${id}`} className="grid gap-x-4 gap-y-1 border-b border-dashed border-line py-3 last:border-b-0 md:grid-cols-[7.5rem_1fr]" onFocus={() => p.onFocusSection(s.title)}>
      <h3 id={`sheet-${id}`} className="flex items-start gap-1 font-bold text-[#1f6fb5]">
        <span aria-hidden="true" className="text-[#4cbfe6]">✤</span>{s.title}
        {ai ? <span className="ml-1 rounded bg-violet-100 px-1 text-xs font-semibold text-violet-900">AI 도움</span> : null}
      </h3>
      <div className="min-w-0 space-y-2">{children}</div>
    </section>
  );
}

function Simple({ k, rows, p }: { k: SimpleKey; rows?: number; p: Props }) {
  const s = sec(k);
  return (
    <SheetRow id={k} p={p}>
      <SectionField id={`r-${k}`} label="" guide={p.readOnly ? undefined : s.question} starter={s.starter} rows={rows} readOnly={p.readOnly} draft={p.content.drafts.includes(k)} value={p.content[k]} onChange={(v) => p.update((c) => ({ ...c, [k]: v, drafts: c.drafts.filter((d) => d !== k) }))} ariaLabel={s.title} />
    </SheetRow>
  );
}

const Badge = ({ text }: { text: string }) => <span className="mr-1 rounded-full bg-[#4cbfe6] px-2 py-0.5 text-xs font-extrabold text-white">{text}</span>;

/** 과정 — 활동 1, 2…마다 제목과 ➊➋ 순서(초안, 학생이 고친다). 예전 보고서는 과정 글 하나 */
function Process({ p }: { p: Props }) {
  const acts = p.content.activities;
  const setSteps = (i: number) => (v: string) => p.update((c) => ({ ...c, activities: c.activities.map((a, j) => (j === i ? { ...a, steps: v } : a)), drafts: c.drafts.filter((d) => d !== "procedure") }));
  const draft = p.content.drafts.includes("procedure");
  if (acts.length === 0) {
    return <SectionField id="r-procedure" label="" rows={8} readOnly={p.readOnly} draft={draft} value={p.content.procedure} maxLength={3000} ariaLabel="과정" onChange={(v) => p.update((c) => ({ ...c, procedure: v }))} />;
  }
  return <ol className="space-y-3">{acts.map((a, i) => <Activity key={`${i}-${a.title}`} a={a} i={i} p={p} draft={draft && i === 0} onChange={setSteps(i)} />)}</ol>;
}

function Activity({ a, i, p, draft, onChange }: { a: ReportContent["activities"][number]; i: number; p: Props; draft: boolean; onChange: (v: string) => void }) {
  return (
    <li className="space-y-1">
      <p className="font-bold text-[#1f6fb5]"><Badge text={`활동 ${i + 1}`} />{a.title}</p>
      <SectionField id={`r-act-${i + 1}`} label="" rows={Math.min(10, a.steps.split("\n").length + 1)} readOnly={p.readOnly} draft={draft} value={a.steps} maxLength={3000} ariaLabel={`활동 ${i + 1} ${a.title} 과정`} onChange={onChange} />
    </li>
  );
}

/** 자료 하나 — 표·관찰·시간–온도 그래프 + "알 수 있는 점" */
function DataBlock({ d, i, p }: { d: ReportContent["data"][number]; i: number; p: Props }) {
  const n = i + 1;
  const setNote = (v: string) => p.update((c) => ({ ...c, data: c.data.map((x, j) => (j === i ? { ...x, note: v } : x)) }));
  return (
    <li className="space-y-2 rounded-lg border border-line bg-white p-2 print:break-inside-avoid">
      <p className="font-bold"><Badge text={`자료 ${n}`} />{d.title}</p>
      {d.rows.length ? <ResultsTable table={{ columns: d.columns, rows: d.rows }} caption={`자료 ${n} ${d.title}`} /> : null}
      {d.observations.map((o) => <p key={o} className="rounded bg-[#f4f8ff] px-2 py-1 text-sm">👀 관찰: {o}</p>)}
      <SeriesChart series={d.series} title={`자료 ${n}`} />
      <SectionField id={`r-data-${n}`} label={`자료 ${n}에서 알 수 있는 점`} starter={`자료 ${n}을(를) 보면`} rows={2} readOnly={p.readOnly} value={d.note} maxLength={800} onChange={setNote} />
    </li>
  );
}

/** 자료 해석 — 자료 1, 2…. 예전 보고서는 결과 표 하나 */
function DataAnalysis({ p }: { p: Props }) {
  const data = p.content.data;
  if (data.length === 0) {
    const t = p.content.resultsTable;
    return t.rows.length || !p.content.results.trim() ? <ResultsTable table={t} caption="실험 결과 표" /> : <p className="whitespace-pre-wrap text-sm">{p.content.results}</p>;
  }
  return (
    <>
      {p.readOnly ? null : <p className="text-xs text-muted print:hidden">📋 {sec("results").question}</p>}
      <ol className="space-y-3">{data.map((d, i) => <DataBlock key={`${i}-${d.title}`} d={d} i={i} p={p} />)}</ol>
    </>
  );
}

const VERDICTS: { id: ReportContent["interpretation"]["hypothesisVerdict"]; label: string }[] = [
  { id: "supported", label: "⭕ 내 예상이 맞았어요" },
  { id: "rejected", label: "❌ 내 예상과 달랐어요" },
  { id: "unclear", label: "🤔 아직 잘 모르겠어요" },
];

function VerdictChoice({ value, readOnly, onPick }: { value: string; readOnly: boolean; onPick: (v: string) => void }) {
  const chosen = VERDICTS.find((v) => v.id === value)?.label;
  return (
    <>
    <p className="hidden text-sm print:block"><span className="font-semibold">실험 전 내 예상(가설)이 맞았나요?</span> {chosen ?? ""}</p>
    <fieldset className="text-sm print:hidden">
      <legend className="mb-1 text-sm font-semibold">실험 전 내 예상(가설)이 맞았나요?</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">{VERDICTS.map((v) => <label key={v.id} className="tap flex items-center gap-1"><input type="radio" name="verdict" checked={value === v.id} disabled={readOnly} onChange={() => onPick(v.id)} />{v.label}</label>)}</div>
    </fieldset>
    </>
  );
}

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="font-bold text-[#7c3aed]">{n}. {title}</p>
    <div className="space-y-2 pl-3">{children}</div>
  </div>
);

/** 정리 — 1. 탐구 결과 해석 2. 결론 정리 3. 성찰 */
function Summary({ p }: { p: Props }) {
  const i = p.content.interpretation;
  const set = (k: keyof ReportContent["interpretation"]) => (v: string) => p.update((c) => ({ ...c, interpretation: { ...c.interpretation, [k]: v } }));
  return (
    <>
      <Step n={1} title="탐구 결과 해석">
        <VerdictChoice value={i.hypothesisVerdict} readOnly={p.readOnly} onPick={(v) => set("hypothesisVerdict")(v)} />
        <SectionField id="r-evidence" label="그렇게 생각한 까닭 (자료 몇 번의 어떤 값을 보았나요?)" guide="자료에서 어떤 숫자나 모습을 보고 판단했는지 써 봐요." starter="자료 1에서 ~의 값이 ~이므로" readOnly={p.readOnly} value={i.evidence} onChange={set("evidence")} />
      </Step>
      <Step n={2} title="결론 정리">
        <SectionField id="r-trend" label="이 탐구로 알게 된 것" guide="자료들을 모아 보면 무엇을 알 수 있나요? 무엇이 같고 무엇이 다른지 정리해 봐요." starter="이 탐구로 ~을(를) 알게 되었다" readOnly={p.readOnly} value={i.trend} onChange={set("trend")} />
        <SectionField id="r-error" label="값이 조금씩 달라진 까닭 (오차)" guide="눈금 읽기, 붓기, 넣기처럼 어디에서 값이 달라질 수 있었을까요?" starter="값이 조금 달라진 까닭은" readOnly={p.readOnly} value={i.errorSources} onChange={set("errorSources")} />
        <SectionField id="r-improve" label="다음에 더 잘하려면" starter="다음에는" readOnly={p.readOnly} value={i.improvements} onChange={set("improvements")} />
      </Step>
      <Step n={3} title="성찰">
        <ReflectionForm content={p.content} update={p.update} readOnly={p.readOnly} onFocusSection={p.onFocusSection} />
      </Step>
    </>
  );
}

export default function ReportForm(p: Props) {
  return (
    <div className="rounded-xl border-2 border-[#bfe3f5] bg-[#fbfdff] px-4 py-1 print:rounded-none print:border print:border-[#bfe3f5] print:bg-white">
      <Simple k="title" rows={1} p={p} />
      <Simple k="goal" rows={2} p={p} />
      <Simple k="hypothesis" p={p} />
      <Simple k="materials" rows={2} p={p} />
      <SheetRow id="procedure" p={p}><Process p={p} /></SheetRow>
      <SheetRow id="results" p={p}><DataAnalysis p={p} /></SheetRow>
      <SheetRow id="interpretation" p={p}><Summary p={p} /></SheetRow>
    </div>
  );
}
