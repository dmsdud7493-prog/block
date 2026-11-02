"use client";
/** 보고서 1~7항목 (지침 6.1·6.2·6.3) — 변인 칸은 없고(ADR-P19), 결과는 표로, 해석·결론은 중학생 말로 묻는다 */
import { SECTIONS, type ReportContent } from "@/lib/report/template";
import SectionField from "./SectionField";
import ResultsTable from "./ResultsTable";
import type { Updater } from "./useReport";

interface Props { content: ReportContent; update: (fn: Updater) => void; readOnly: boolean; onFocusSection: (title: string) => void }

const sec = (id: string) => SECTIONS.find((s) => s.id === id)!;
type SimpleKey = "title" | "goal" | "hypothesis" | "materials" | "procedure";

function Simple({ k, rows, p }: { k: SimpleKey; rows?: number; p: Props }) {
  const s = sec(k);
  return (
    <div onFocus={() => p.onFocusSection(s.title)}>
      <SectionField id={`r-${k}`} label={s.title} guide={s.question} starter={s.starter} rows={rows} readOnly={p.readOnly} draft={p.content.drafts.includes(k)} value={p.content[k]} onChange={(v) => p.update((c) => ({ ...c, [k]: v, drafts: c.drafts.filter((d) => d !== k) }))} maxLength={k === "procedure" ? 3000 : 1000} />
    </div>
  );
}

/** 6. 결과 — 실험 기록에서 옮긴 표(고치는 칸이 아님). 예전 보고서처럼 표가 없으면 글 칸을 보여 준다 */
function Results({ p }: { p: Props }) {
  const s = sec("results");
  const t = p.content.resultsTable;
  if (t.rows.length === 0 && p.content.results.trim()) {
    return <SectionField id="r-results" label={s.title} rows={6} readOnly={p.readOnly} value={p.content.results} onChange={(v) => p.update((c) => ({ ...c, results: v }))} />;
  }
  return (
    <section aria-labelledby="r-results-title" className="space-y-1" onFocus={() => p.onFocusSection(s.title)}>
      <h3 id="r-results-title" className="text-sm font-semibold">{s.title}</h3>
      <p className="text-xs text-muted">📋 {s.question}</p>
      <ResultsTable table={t} caption="실험 결과 표" />
    </section>
  );
}

const VERDICTS: { id: ReportContent["interpretation"]["hypothesisVerdict"]; label: string }[] = [
  { id: "supported", label: "⭕ 내 예상이 맞았어요" },
  { id: "rejected", label: "❌ 내 예상과 달랐어요" },
  { id: "unclear", label: "🤔 아직 잘 모르겠어요" },
];

function Interpretation({ p }: { p: Props }) {
  const s = sec("interpretation");
  const i = p.content.interpretation;
  const set = (k: keyof ReportContent["interpretation"]) => (v: string) => p.update((c) => ({ ...c, interpretation: { ...c.interpretation, [k]: v } }));
  return (
    <fieldset className="space-y-2" onFocus={() => p.onFocusSection(s.title)}>
      <legend className="text-sm font-semibold">{s.title}</legend>
      <SectionField id="r-trend" label="① 결과에서 알게 된 것" guide="표의 값을 서로 비교해 봐요. 무엇이 크고 작은지, 무엇이 같은지 찾아봐요." starter="표를 보면 ~은(는) ~보다" readOnly={p.readOnly} value={i.trend} onChange={set("trend")} />
      <VerdictChoice value={i.hypothesisVerdict} readOnly={p.readOnly} onPick={(v) => set("hypothesisVerdict")(v)} />
      <SectionField id="r-evidence" label="③ 그렇게 생각한 까닭 (표의 어떤 값을 보았나요?)" guide="표에서 어떤 숫자를 보고 그렇게 판단했는지 숫자를 넣어 써 봐요." starter="표에서 ~의 값이 ~이므로" readOnly={p.readOnly} value={i.evidence} onChange={set("evidence")} />
      <SectionField id="r-error" label="④ 값이 조금씩 달라진 까닭 (오차)" guide="눈금 읽기, 붓기, 넣기처럼 어디에서 값이 달라질 수 있었을까요?" starter="값이 조금 달라진 까닭은" readOnly={p.readOnly} value={i.errorSources} onChange={set("errorSources")} />
      <SectionField id="r-improve" label="⑤ 다음에 더 잘하려면" starter="다음에는" readOnly={p.readOnly} value={i.improvements} onChange={set("improvements")} />
    </fieldset>
  );
}

function VerdictChoice({ value, readOnly, onPick }: { value: string; readOnly: boolean; onPick: (v: string) => void }) {
  return (
    <fieldset className="flex flex-wrap gap-3 text-sm">
      <legend className="mb-1 text-sm font-semibold">② 실험 전 내 예상(3. 가설)이 맞았나요?</legend>
      {VERDICTS.map((v) => <label key={v.id} className="tap flex items-center gap-1"><input type="radio" name="verdict" checked={value === v.id} disabled={readOnly} onChange={() => onPick(v.id)} />{v.label}</label>)}
    </fieldset>
  );
}

export default function ReportForm(p: Props) {
  return (
    <div className="space-y-4">
      <Simple k="title" rows={1} p={p} />
      <Simple k="goal" rows={2} p={p} />
      <Simple k="hypothesis" p={p} />
      <Simple k="materials" rows={2} p={p} />
      <Simple k="procedure" rows={8} p={p} />
      <Results p={p} />
      <Interpretation p={p} />
    </div>
  );
}
