"use client";
/** 예측–결과 비교 (지침 3.3) — 같았는지/달랐는지와 그 이유를 학생이 적는다. 맞힘 점수는 없다. */
import { useState } from "react";
import type { PredictionTarget } from "@/lib/engine/experiments/types";
import type { PredictionRecord } from "@/components/lab/types";

function Verdict({ name, matched, onPick }: { name: string; matched: boolean | null; onPick: (m: boolean) => void }) {
  return (
    <fieldset className="flex gap-3 text-sm">
      <legend className="sr-only">예상과 결과가 같았나요?</legend>
      <label className="tap flex items-center gap-1"><input type="radio" name={name} checked={matched === true} onChange={() => onPick(true)} />예상과 같았어요</label>
      <label className="tap flex items-center gap-1"><input type="radio" name={name} checked={matched === false} onChange={() => onPick(false)} />예상과 달랐어요</label>
    </fieldset>
  );
}

function OneTarget({ target, record, onSave }: { target: PredictionTarget; record: PredictionRecord; onSave: (matched: boolean, text: string) => void }) {
  const [matched, setMatched] = useState<boolean | null>(record.matched ?? null);
  const [text, setText] = useState(record.rationaleAfter ?? "");
  const choice = target.choices.find((c) => c.id === record.choice)?.label ?? "-";
  const saved = typeof record.matched === "boolean" && (record.rationaleAfter ?? "").length >= 5;
  return (
    <li className="rounded border border-line bg-panel p-2">
      <p className="text-sm font-semibold">{target.question}</p>
      <p className="text-sm">내 예상: <strong>{choice}</strong> — {record.rationale}</p>
      <Verdict name={`after-${target.id}`} matched={matched} onPick={setMatched} />
      <label className="mt-1 block text-sm" htmlFor={`after-why-${target.id}`}>{matched === false ? "왜 달랐을까요? 데이터에서 근거를 찾아 적어 보세요." : "결과의 어떤 값이 예상을 뒷받침하나요?"}</label>
      <textarea id={`after-why-${target.id}`} className="h-16 w-full rounded border border-line p-1 text-sm" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
      <button type="button" className="tap mt-1 rounded bg-brand px-3 text-sm font-bold text-white disabled:opacity-50" disabled={matched === null || text.trim().length < 5} onClick={() => onSave(Boolean(matched), text.trim())}>{saved ? "다시 저장" : "저장"}</button>
      {saved ? <span className="ml-2 text-sm text-ok" aria-live="polite">저장했어요</span> : null}
    </li>
  );
}

export default function AfterExplain({ targets, predictions, onSave }: { targets: PredictionTarget[]; predictions: PredictionRecord[]; onSave: (target: string, matched: boolean, text: string) => void }) {
  const items = targets.map((t) => ({ t, r: predictions.find((p) => p.target === t.id) })).filter((x): x is { t: PredictionTarget; r: PredictionRecord } => Boolean(x.r?.choice));
  return (
    <section aria-labelledby="after-title" className="space-y-2">
      <h3 id="after-title" className="font-bold">🔁 예상과 결과 비교하기</h3>
      <ul className="space-y-2">{items.map(({ t, r }) => <OneTarget key={t.id} target={t} record={r} onSave={(m, txt) => onSave(t.id, m, txt)} />)}</ul>
    </section>
  );
}
