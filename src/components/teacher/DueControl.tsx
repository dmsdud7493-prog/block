"use client";
/** T-04 마감·지각 제출 허용 조정 */
import { useState } from "react";
import type { AssignmentRow } from "@/lib/teacherTypes";
import { useAction } from "./useAction";

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function DueControl({ assignment }: { assignment: AssignmentRow }) {
  const [due, setDue] = useState(toLocal(assignment.dueAt));
  const [allowLate, setAllowLate] = useState(assignment.allowLate);
  const act = useAction<{ assignmentId: string }>("/api/class/assignment");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void act.run({ assignmentId: assignment.id, dueAt: due ? new Date(due).toISOString() : null, allowLate });
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 text-sm" aria-label="마감 조정">
      <label className="font-semibold">마감<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="tap mt-1 block rounded border border-line px-2 font-normal" /></label>
      <label className="tap flex items-center gap-2"><input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} />마감 후 제출 허용</label>
      <button type="submit" disabled={act.busy} className="tap rounded border border-brand px-3 font-semibold text-brand">마감 저장</button>
      {act.error ? <p role="alert" className="text-err">{act.error}</p> : null}
    </form>
  );
}
