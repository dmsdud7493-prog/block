/** T-05 제출된 보고서(스냅숏) 읽기 — AI 도움을 받았다고 학생이 표시한 칸은 배지로 보여 준다 (R11) */
import { SECTIONS, REFLECTION_QUESTIONS, reportContentSchema } from "@/lib/report/template";

const VERDICT: Record<string, string> = { supported: "가설이 지지되었다", rejected: "가설이 기각되었다", unclear: "자료만으로는 판단하기 어렵다", "": "(고르지 않음)" };
const SIMPLE = ["title", "goal", "hypothesis", "materials", "procedure", "results"] as const;
type SimpleId = (typeof SIMPLE)[number];

function Block({ title, ai, children }: { title: string; ai: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded border border-line p-2">
      <h3 className="flex items-center gap-2 font-semibold">{title}{ai ? <span className="rounded bg-violet-100 px-1 text-xs text-violet-900">AI 도움 표시</span> : null}</h3>
      <div className="mt-1 whitespace-pre-wrap text-sm">{children}</div>
    </section>
  );
}

export default function ReportReadOnly({ content, aiAssisted }: { content: Record<string, unknown>; aiAssisted: string[] }) {
  const parsed = reportContentSchema.safeParse(content);
  if (!parsed.success) return <p className="text-sm">보고서 형식을 읽을 수 없어요.</p>;
  const c = parsed.data;
  const i = c.interpretation;
  const head = SECTIONS.filter((s) => (SIMPLE as readonly string[]).includes(s.id));
  const reflection = REFLECTION_QUESTIONS.map((q) => `• ${q.label}\n  ${c.reflection[q.id] || "—"}`).join("\n");
  return (
    <div className="space-y-2">
      {head.map((s) => <Block key={s.id} title={s.title} ai={aiAssisted.includes(s.id)}>{c[s.id as SimpleId] || "—"}</Block>)}
      <Block title="4. 변인" ai={aiAssisted.includes("variables")}>{`조작: ${c.variables.independent || "—"}\n종속: ${c.variables.dependent || "—"}\n통제: ${c.variables.controlled || "—"}`}</Block>
      <Block title="8. 해석·결론" ai={aiAssisted.includes("interpretation")}>{`판단: ${VERDICT[i.hypothesisVerdict]}\n경향: ${i.trend || "—"}\n근거: ${i.evidence || "—"}\n오차: ${i.errorSources || "—"}\n개선: ${i.improvements || "—"}`}</Block>
      <Block title="9. 느낀 점·성찰" ai={aiAssisted.includes("reflection")}>{reflection}</Block>
    </div>
  );
}
