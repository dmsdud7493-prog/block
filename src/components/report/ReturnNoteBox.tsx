/** S-08 선생님 피드백 (반환 시) — 루브릭 결과는 제출 후 반환될 때만 보인다 (SUMMATIVE) */
import { LEVEL_LABEL, RUBRIC, type RubricLevel } from "@/lib/report/rubric";
import type { SessionView } from "@/components/lab/types";

export interface FeedbackData { rubric: Record<string, RubricLevel> | null; feedback: string | null; returnedAt: string | null; /** 한 번 더 고쳐 낼 수 있는가(선생님이 돌려줌). false면 채점 끝 */ canRevise?: boolean }

/** 세션의 제출 기록에서 반환된 루브릭·코멘트만 꺼낸다 (반환 전에는 null) */
export function returnNoteOf(view: SessionView): FeedbackData | null {
  const s = view.submission;
  if (!s || !s.returned_at) return null;
  return { rubric: (s.rubric_scores as Record<string, RubricLevel> | null) ?? null, feedback: s.teacher_feedback, returnedAt: s.returned_at, canRevise: view.status === "returned" };
}

function Row({ id, level }: { id: string; level: RubricLevel | undefined }) {
  const item = RUBRIC.find((r) => r.id === id);
  if (!item || !level) return null;
  return <li><strong>{item.title}</strong> — {LEVEL_LABEL[level]}: {item.levels[level]}</li>;
}

export default function FeedbackBox({ data }: { data: FeedbackData }) {
  if (!data.returnedAt) return null;
  return (
    <section aria-labelledby="fb-title" aria-live="polite" className="rounded-lg border-2 border-ok bg-emerald-50 p-3">
      <h2 id="fb-title" className="font-bold">💬 선생님 피드백</h2>
      {data.feedback ? <p className="mt-1 whitespace-pre-wrap text-sm">{data.feedback}</p> : null}
      <ul className="mt-2 space-y-1 text-sm">{RUBRIC.map((r) => <Row key={r.id} id={r.id} level={data.rubric?.[r.id]} />)}</ul>
      <p className="mt-2 text-sm font-semibold">{data.canRevise === false ? "🏁 채점이 끝났어요. 끝까지 탐구한 나에게 박수! 👏" : "✏️ 피드백을 읽고 보고서를 고쳐서 다시 낼 수 있어요. 고쳐 내기는 한 번만 할 수 있으니 꼼꼼히 고쳐 보세요."}</p>
    </section>
  );
}
