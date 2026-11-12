"use client";
/** T-02 실험 배정 — 마감·지각 허용, (혼합물 분리) 넣는 양 정해 주기 / 학생이 정하기 (ADR-P26) */
import { useState } from "react";
import type { AssignmentRow } from "@/lib/teacherTypes";
import { CATALOGS, EXPERIMENT_ORDER } from "@/lib/engine/experiments";
import { useAction } from "./useAction";
import { fixedAmountsText } from "@/lib/engine/rules/fixedAmounts";

function Row({ a }: { a: AssignmentRow }) {
  const due = a.dueAt ? new Date(a.dueAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "마감 없음";
  return <li className="text-sm">📌 {a.title} · {due} · {a.allowLate ? "지각 제출 허용" : "마감 후 제출 불가"}{a.fixedAmounts ? " · 넣는 양 정해 줌" : ""}</li>;
}

/** 넣는 양 — 정해 주면 반 전체 결과를 같은 조건에서 비교할 수 있고, 자유면 학생이 조건을 정해 보며 탐구한다 */
function AmountChoice({ fixed, setFixed, text }: { fixed: boolean; setFixed: (v: boolean) => void; text: string }) {
  return (
    <fieldset className="basis-full rounded border border-line p-2 text-sm">
      <legend className="px-1 font-semibold">넣는 양</legend>
      <label className="tap flex items-center gap-2"><input type="radio" name="amounts" checked={!fixed} onChange={() => setFixed(false)} />학생이 정하기 — 학생마다 양을 바꿔 보며 탐구해요(결과 값이 학생마다 달라요)</label>
      <label className="tap flex items-center gap-2"><input type="radio" name="amounts" checked={fixed} onChange={() => setFixed(true)} />정해 주기 — {text}(반 전체 결과를 같은 조건에서 비교해요)</label>
    </fieldset>
  );
}

export default function AssignForm({ classId, assignments }: { classId: string; assignments: AssignmentRow[] }) {
  const [slug, setSlug] = useState<string>(EXPERIMENT_ORDER[0]);
  const [due, setDue] = useState("");
  const [allowLate, setAllowLate] = useState(true);
  const [fixed, setFixed] = useState(false);
  const catalog = CATALOGS[slug];
  const canFix = Boolean(catalog?.fixedAmounts?.length);
  const act = useAction<{ assignmentId: string }>("/api/class/assign");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void act.run({ classId, slug, dueAt: due ? new Date(due).toISOString() : null, allowLate, settings: canFix && fixed ? { fixed_amounts: true } : {} });
  };
  return (
    <section aria-labelledby="asg-title" className="rounded-lg border border-line bg-panel p-3">
      <h2 id="asg-title" className="text-lg font-bold">📋 실험 배정</h2>
      <ul className="mt-1 space-y-1">{assignments.map((a) => <Row key={a.id} a={a} />)}</ul>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">실험<select value={slug} onChange={(e) => setSlug(e.target.value)} className="tap mt-1 block rounded border border-line px-2 font-normal">{EXPERIMENT_ORDER.map((s) => <option key={s} value={s}>{CATALOGS[s]?.title}</option>)}</select></label>
        <label className="text-sm font-semibold">마감<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="tap mt-1 block rounded border border-line px-2 font-normal" /></label>
        <label className="tap flex items-center gap-2 text-sm"><input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} />마감 후 제출 허용</label>
        {canFix && catalog ? <AmountChoice fixed={fixed} setFixed={setFixed} text={fixedAmountsText(catalog)} /> : null}
        <button type="submit" disabled={act.busy} className="tap rounded bg-brand px-4 font-bold text-white">배정하기</button>
      </form>
      {act.error ? <p role="alert" className="text-sm text-err">{act.error}</p> : null}
    </section>
  );
}
