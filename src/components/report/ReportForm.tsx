"use client";
/** 보고서 1~8항목 (지침 6.1·6.2·6.3) */
import { SECTIONS, type ReportContent } from "@/lib/report/template";
import SectionField from "./SectionField";
import type { Updater } from "./useReport";

interface Props { content: ReportContent; update: (fn: Updater) => void; readOnly: boolean; onFocusSection: (title: string) => void }

const sec = (id: string) => SECTIONS.find((s) => s.id === id)!;
type SimpleKey = "title" | "goal" | "hypothesis" | "materials" | "procedure" | "results";

function Simple({ k, rows, p }: { k: SimpleKey; rows?: number; p: Props }) {
  const s = sec(k);
  return (
    <div onFocus={() => p.onFocusSection(s.title)}>
      <SectionField id={`r-${k}`} label={s.title} guide={s.question} starter={s.starter} rows={rows} readOnly={p.readOnly} draft={p.content.drafts.includes(k)} value={p.content[k]} onChange={(v) => p.update((c) => ({ ...c, [k]: v, drafts: c.drafts.filter((d) => d !== k) }))} maxLength={k === "procedure" ? 3000 : 1000} />
    </div>
  );
}

function Variables({ p }: { p: Props }) {
  const s = sec("variables");
  const set = (k: keyof ReportContent["variables"]) => (v: string) => p.update((c) => ({ ...c, variables: { ...c.variables, [k]: v }, drafts: c.drafts.filter((d) => d !== "variables") }));
  const draft = p.content.drafts.includes("variables");
  return (
    <fieldset className="space-y-2" onFocus={() => p.onFocusSection(s.title)}>
      <legend className="text-sm font-semibold">{s.title} <span className="font-normal text-muted">— {s.question}</span></legend>
      <SectionField id="r-var-i" label="조작 변인(바꾼 것)" rows={1} draft={draft} readOnly={p.readOnly} value={p.content.variables.independent} onChange={set("independent")} />
      <SectionField id="r-var-d" label="종속 변인(측정한 것)" rows={1} readOnly={p.readOnly} value={p.content.variables.dependent} onChange={set("dependent")} />
      <SectionField id="r-var-c" label="통제 변인(같게 한 것)" rows={1} readOnly={p.readOnly} value={p.content.variables.controlled} onChange={set("controlled")} />
    </fieldset>
  );
}

const VERDICTS: { id: ReportContent["interpretation"]["hypothesisVerdict"]; label: string }[] = [
  { id: "supported", label: "가설이 지지되었다" },
  { id: "rejected", label: "가설이 기각되었다" },
  { id: "unclear", label: "자료만으로는 판단하기 어렵다" },
];

function Interpretation({ p }: { p: Props }) {
  const s = sec("interpretation");
  const i = p.content.interpretation;
  const set = (k: keyof ReportContent["interpretation"]) => (v: string) => p.update((c) => ({ ...c, interpretation: { ...c.interpretation, [k]: v } }));
  return (
    <fieldset className="space-y-2" onFocus={() => p.onFocusSection(s.title)}>
      <legend className="text-sm font-semibold">{s.title}</legend>
      <SectionField id="r-trend" label="결과에서 보이는 경향" guide="표와 그래프에서 어떤 규칙이 보이나요?" starter="표를 보면" readOnly={p.readOnly} value={i.trend} onChange={set("trend")} />
      <VerdictChoice value={i.hypothesisVerdict} readOnly={p.readOnly} onPick={(v) => set("hypothesisVerdict")(v)} />
      <SectionField id="r-evidence" label="근거 (표·그래프의 어느 값?)" starter="근거는 표의" readOnly={p.readOnly} value={i.evidence} onChange={set("evidence")} />
      <SectionField id="r-error" label="오차가 생긴 까닭" guide="측정·조작 중 어디에서 값이 달라질 수 있었을까요?" starter="오차가 생긴 까닭은" readOnly={p.readOnly} value={i.errorSources} onChange={set("errorSources")} />
      <SectionField id="r-improve" label="다음에 고칠 점(개선안)" starter="다음에는" readOnly={p.readOnly} value={i.improvements} onChange={set("improvements")} />
    </fieldset>
  );
}

function VerdictChoice({ value, readOnly, onPick }: { value: string; readOnly: boolean; onPick: (v: string) => void }) {
  return (
    <fieldset className="flex flex-wrap gap-3 text-sm">
      <legend className="mb-1 text-sm font-semibold">가설 판단</legend>
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
      <Variables p={p} />
      <Simple k="materials" rows={2} p={p} />
      <Simple k="procedure" rows={8} p={p} />
      <Simple k="results" rows={6} p={p} />
      <Interpretation p={p} />
    </div>
  );
}
