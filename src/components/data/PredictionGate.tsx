"use client";
/**
 * 예측 게이트 (지침 3.1, 4.2) — 실행·그래프 공개 전에 결과와 이유를 먼저 적는다.
 * 어려우면 힌트 P1→P3를 하나씩(정답은 주지 않음). 예측은 형성평가: 맞고 틀림을 매기지 않는다.
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { PredictionTarget } from "@/lib/engine/experiments/types";
import type { PredictionRecord } from "@/components/lab/types";

interface Props {
  target: PredictionTarget;
  record: PredictionRecord | undefined;
  onHint: () => void;
  onSubmit: (choice: string, rationale: string) => void;
  onCancel: () => void;
  purpose: string;
}

function Choice({ name, id, label, checked, onPick }: { name: string; id: string; label: string; checked: boolean; onPick: (id: string) => void }) {
  return (
    <label className={`tap flex cursor-pointer items-center gap-2 rounded border p-2 ${checked ? "border-brand bg-blue-50" : "border-line"}`}>
      <input type="radio" name={name} value={id} checked={checked} onChange={() => onPick(id)} className="h-5 w-5" />
      <span>{label}</span>
    </label>
  );
}

function Hints({ target, used, onHint }: { target: PredictionTarget; used: number; onHint: () => void }) {
  const shown = target.hints.slice(0, used);
  return (
    <div className="mt-3">
      <ol className="space-y-1 text-sm" aria-live="polite">{shown.map((h, i) => <li key={h} className="rounded bg-amber-50 p-2">💡 힌트 {i + 1}: {h}</li>)}</ol>
      {used >= 3 ? <p className="mt-1 text-sm">틀려도 괜찮아요. 예상과 결과가 다를 때 더 많이 배워요. 지금 생각을 골라 보세요.</p> : null}
      {used < 3 ? <button type="button" className="tap mt-2 rounded border border-amber-600 px-3 text-sm text-amber-800" onClick={onHint}>잘 모르겠어요 · 힌트 {used + 1} 보기</button> : null}
    </div>
  );
}

function ChoiceSet({ target, choice, onPick }: { target: PredictionTarget; choice: string; onPick: (id: string) => void }) {
  return (
    <fieldset className="mt-3 space-y-2">
      <legend className="font-semibold">{target.question}</legend>
      {target.choices.map((c) => <Choice key={c.id} name={target.id} id={c.id} label={c.label} checked={choice === c.id} onPick={onPick} />)}
    </fieldset>
  );
}

function Actions({ ready, onCancel }: { ready: boolean; onCancel: () => void }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button type="button" className="tap rounded border border-line px-3" onClick={onCancel}>나중에</button>
      <button type="submit" className="tap rounded bg-brand px-4 font-bold text-white disabled:opacity-50" disabled={!ready}>예상 저장하기</button>
    </div>
  );
}

export default function PredictionGate({ target, record, onHint, onSubmit, onCancel, purpose }: Props) {
  const [choice, setChoice] = useState(record?.choice ?? "");
  const [why, setWhy] = useState(record?.rationale ?? "");
  const ready = choice !== "" && why.trim().length >= 5;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready) onSubmit(choice, why.trim());
  };
  return (
    <Modal labelledBy="gate-title" onClose={onCancel}>
      <form onSubmit={submit}>
        <h2 id="gate-title" className="text-lg font-bold">🤔 {purpose} 먼저 예상해 볼까요?</h2>
        <ChoiceSet target={target} choice={choice} onPick={setChoice} />
        <label className="mt-3 block text-sm font-semibold" htmlFor="gate-why">왜 그렇게 생각했나요? (한 줄, 5자 이상)</label>
        <input id="gate-why" className="tap mt-1 w-full rounded border border-line px-2" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="왜냐하면 …" maxLength={200} />
        <Hints target={target} used={record?.hintsUsed ?? 0} onHint={onHint} />
        <Actions ready={ready} onCancel={onCancel} />
      </form>
    </Modal>
  );
}
