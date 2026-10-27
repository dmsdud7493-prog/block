"use client";
/**
 * T-05 루브릭 채점 (지침 6.3, R11 교사 최종 판단, SUMMATIVE).
 * - 초안 저장: 교사만 보임 / 확정·돌려주기: 학생에게 루브릭·코멘트가 보이고 보고서를 다시 고칠 수 있다
 * - 모든 성적 변경은 서버에서 감사 로그(grade_audit_log)에 남는다
 */
import { useState } from "react";
import { COMMENT_BANK, LEVEL_LABEL, RUBRIC, type RubricLevel } from "@/lib/report/rubric";
import type { SubmissionDetail } from "@/lib/teacherTypes";
import { useAction } from "./useAction";

const LEVELS: RubricLevel[] = ["high", "mid", "low"];
const REASON_LABEL: Record<string, string> = { first_return: "처음 돌려줌", regrade: "다시 채점" };

function Item({ id, value, onPick }: { id: (typeof RUBRIC)[number]["id"]; value: string | undefined; onPick: (v: RubricLevel) => void }) {
  const item = RUBRIC.find((r) => r.id === id)!;
  return (
    <fieldset className="rounded border border-line p-2">
      <legend className="px-1 font-semibold">{item.title}</legend>
      {LEVELS.map((l) => <label key={l} className="tap flex items-start gap-2 text-sm"><input type="radio" name={`rubric-${id}`} checked={value === l} onChange={() => onPick(l)} className="mt-1" /><span><strong>{LEVEL_LABEL[l]}</strong> — {item.levels[l]}</span></label>)}
    </fieldset>
  );
}

function Bank({ onAdd }: { onAdd: (p: string) => void }) {
  return (
    <details className="text-sm">
      <summary className="tap cursor-pointer font-semibold">💡 코멘트 뱅크에서 넣기</summary>
      <ul className="mt-1 space-y-1">{COMMENT_BANK.flatMap((b) => b.phrases).map((p) => <li key={p}><button type="button" className="tap text-left underline" onClick={() => onAdd(p)}>+ {p}</button></li>)}</ul>
    </details>
  );
}

export default function RubricGrader({ detail }: { detail: SubmissionDetail }) {
  const start = detail.draft ?? { rubric: detail.rubric, feedback: detail.feedback };
  const [rubric, setRubric] = useState<Record<string, string>>(start.rubric);
  const [comment, setComment] = useState(start.feedback);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const act = useAction<{ saved: boolean; returnedAt: string | null }>("/api/grade");
  const canReturn = detail.status === "submitted" || detail.status === "resubmitted";
  const complete = RUBRIC.every((r) => rubric[r.id]);
  const send = (action: "draft" | "return") => {
    setDone(null);
    void act.run({ submissionId: detail.submissionId, action, rubric, feedback: comment, reason: reason || undefined })
      .then((r) => setDone(r ? (action === "draft" ? "초안을 저장했어요 (학생에게는 아직 안 보여요)." : "학생에게 돌려줬어요. 학생이 보고서를 고쳐 다시 낼 수 있어요.") : null));
  };
  return (
    <section aria-labelledby="grade-title" className="space-y-3 rounded-lg border-2 border-brand bg-panel p-3">
      <h2 id="grade-title" className="text-lg font-bold">✍️ 루브릭 채점·코멘트</h2>
      {RUBRIC.map((r) => <Item key={r.id} id={r.id} value={rubric[r.id]} onPick={(v) => setRubric((x) => ({ ...x, [r.id]: v }))} />)}
      <label htmlFor="grade-comment" className="block font-semibold">학생에게 남길 말 (행동을 짚어 격려해 주세요)</label>
      <textarea id="grade-comment" rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded border border-line p-2 text-sm" />
      <Bank onAdd={(p) => setComment((c) => (c.trim() ? `${c}\n${p}` : p))} />
      {detail.returnedAt ? <label className="block text-sm font-semibold">다시 채점하는 까닭 (기록에 남아요)<input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className="tap mt-1 block w-full rounded border border-line px-2 font-normal" /></label> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={act.busy} onClick={() => send("draft")} className="tap rounded border border-brand px-3 font-semibold text-brand">초안 저장</button>
        <button type="button" disabled={act.busy || !complete || !canReturn} onClick={() => send("return")} className="tap rounded bg-brand px-4 font-bold text-white disabled:opacity-50">확정하고 돌려주기</button>
      </div>
      {!canReturn ? <p className="text-sm text-muted">학생이 고치는 중이에요. 다시 제출하면 채점할 수 있어요.</p> : null}
      {!complete && canReturn ? <p className="text-sm text-muted">4항목을 모두 골라야 돌려줄 수 있어요.</p> : null}
      <p aria-live="polite" className="text-sm text-ok">{done}</p>
      {act.error ? <p role="alert" className="text-sm text-err">{act.error}</p> : null}
      {detail.history.length ? <p className="text-xs text-muted">채점 기록: {detail.history.map((h) => `${REASON_LABEL[h.reason] ?? h.reason} ${new Date(h.at).toLocaleString("ko-KR")}`).join(" · ")}</p> : null}
    </section>
  );
}
