/** T-05 제출된 보고서(스냅숏) 읽기 — AI 도움을 받았다고 학생이 표시한 칸은 배지로 보여 준다 (R11) */
import { SECTIONS, REFLECTION_QUESTIONS, reportContentSchema } from "@/lib/report/template";
import ResultsTable from "@/components/report/ResultsTable";

const VERDICT: Record<string, string> = { supported: "내 예상이 맞았어요", rejected: "내 예상과 달랐어요", unclear: "아직 잘 모르겠어요", "": "(고르지 않음)" };
const SIMPLE = ["title", "goal", "hypothesis", "materials", "procedure"] as const;
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
      <Block title="6. 결과" ai={aiAssisted.includes("results")}>{c.resultsTable.rows.length ? <ResultsTable table={c.resultsTable} caption="제출한 결과 표" /> : c.results || "—"}</Block>
      <Block title="7. 해석·결론" ai={aiAssisted.includes("interpretation")}>{`알게 된 것: ${i.trend || "—"}\n예상이 맞았나: ${VERDICT[i.hypothesisVerdict]}\n그렇게 생각한 까닭: ${i.evidence || "—"}\n오차: ${i.errorSources || "—"}\n다음에: ${i.improvements || "—"}`}</Block>
      <Block title="8. 느낀 점·성찰" ai={aiAssisted.includes("reflection")}>{reflection}</Block>
    </div>
  );
}
