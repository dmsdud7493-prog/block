"use client";
/** T-02 실험 배정 — 마감·지각 허용 */
import { useState } from "react";
import type { AssignmentRow } from "@/lib/teacherTypes";
import { CATALOGS, EXPERIMENT_ORDER } from "@/lib/engine/experiments";
import { useAction } from "./useAction";

function Row({ a }: { a: AssignmentRow }) {
  const due = a.dueAt ? new Date(a.dueAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "마감 없음";
  return <li className="text-sm">📌 {a.title} · {due} · {a.allowLate ? "지각 제출 허용" : "마감 후 제출 불가"}</li>;
}

export default function AssignForm({ classId, assignments }: { classId: string; assignments: AssignmentRow[] }) {
  const [slug, setSlug] = useState<string>(EXPERIMENT_ORDER[0]);
  const [due, setDue] = useState("");
  const [allowLate, setAllowLate] = useState(true);
  const act = useAction<{ assignmentId: string }>("/api/class/assign");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void act.run({ classId, slug, dueAt: due ? new Date(due).toISOString() : null, allowLate });
  };
  return (
    <section aria-labelledby="asg-title" className="rounded-lg border border-line bg-panel p-3">
      <h2 id="asg-title" className="text-lg font-bold">📋 실험 배정</h2>
      <ul className="mt-1 space-y-1">{assignments.map((a) => <Row key={a.id} a={a} />)}</ul>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">실험<select value={slug} onChange={(e) => setSlug(e.target.value)} className="tap mt-1 block rounded border border-line px-2 font-normal">{EXPERIMENT_ORDER.map((s) => <option key={s} value={s}>{CATALOGS[s]?.title}</option>)}</select></label>
        <label className="text-sm font-semibold">마감<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="tap mt-1 block rounded border border-line px-2 font-normal" /></label>
        <label className="tap flex items-center gap-2 text-sm"><input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} />마감 후 제출 허용</label>
        <button type="submit" disabled={act.busy} className="tap rounded bg-brand px-4 font-bold text-white">배정하기</button>
      </form>
      {act.error ? <p role="alert" className="text-sm text-err">{act.error}</p> : null}
    </section>
  );
}
