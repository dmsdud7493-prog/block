"use client";
/** 9. 느낀 점·성찰 — 4질문 (지침 6.4, 요구사항 12). "재미있었다"로 끝나지 않게 구체적인 질문으로 묻는다 */
import { REFLECTION_QUESTIONS, type ReportContent } from "@/lib/report/template";
import SectionField from "./SectionField";
import type { Updater } from "./useReport";

export default function ReflectionForm({ content, update, readOnly, onFocusSection }: { content: ReportContent; update: (fn: Updater) => void; readOnly: boolean; onFocusSection: (t: string) => void }) {
  return (
    <fieldset className="space-y-3 rounded-lg border-2 border-violet-300 bg-violet-50 p-3" onFocus={() => onFocusSection("9. 느낀 점·성찰")}>
      <legend className="px-1 text-sm font-bold">9. 느낀 점·성찰 — 실험을 하면서 생각한 것을 돌아봐요 (4개 중 3개 이상)</legend>
      {REFLECTION_QUESTIONS.map((q) => <SectionField key={q.id} id={`r-ref-${q.id}`} label={q.label} starter={q.starter} readOnly={readOnly} value={content.reflection[q.id]} onChange={(v) => update((c) => ({ ...c, reflection: { ...c.reflection, [q.id]: v } }))} />)}
    </fieldset>
  );
}
