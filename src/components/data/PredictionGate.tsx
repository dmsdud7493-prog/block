"use client";
/**
 * 예측 게이트 (지침 3.1, 4.2) — 실행·그래프 공개 전에 결과와 이유를 먼저 적는다.
 * 어려우면 힌트 P1→P3를 하나씩(정답은 주지 않음). 예측은 형성평가: 맞고 틀림을 매기지 않는다.
 * 겉모양은 '카드 고르기'(사용자 선택 시안 3-A, 2026-11-13): 보기마다 색 카드 한 장, 고른 카드는 살짝 들리고 노란 테두리.
 * 카드는 라디오 단추를 감싼 label이라 키보드(화살표·Space)와 화면 읽기 프로그램으로도 똑같이 고른다.
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { PredictionTarget } from "@/lib/engine/experiments/types";
import type { PredictionRecord } from "@/components/lab/types";
import SketchPad, { type Sketch } from "./SketchPad";
import ChoicePicture from "./ChoicePicture";

interface Props {
  target: PredictionTarget;
  record: PredictionRecord | undefined;
  onHint: () => void;
  onSubmit: (choice: string, rationale: string, sketch?: Sketch) => void;
  onCancel: () => void;
  purpose: string;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];
/** 카드 색 — 흰 글씨 대비 4.5:1 이상인 진한 색만 */
const CARD = [
  "from-blue-600 to-blue-900",
  "from-emerald-600 to-emerald-900",
  "from-amber-600 to-orange-800",
  "from-pink-600 to-rose-900",
  "from-violet-600 to-violet-900",
  "from-cyan-700 to-sky-900",
];
const COLS: Record<number, string> = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" };

function Card({ name, id, label, index, checked, targetId, onPick }: { name: string; id: string; label: string; index: number; checked: boolean; targetId: string; onPick: (id: string) => void }) {
  const lift = checked ? "-translate-y-2 -rotate-1 outline outline-4 outline-yellow-300 shadow-[0_14px_24px_rgba(0,0,0,0.3)]" : "shadow-[0_5px_0_rgba(0,0,0,0.15)]";
  return (
    <label className={`relative flex min-h-[150px] cursor-pointer flex-col rounded-2xl border-[3px] border-white/40 bg-gradient-to-b p-2.5 text-white transition-transform motion-reduce:transition-none focus-within:ring-4 focus-within:ring-sky-300 ${CARD[index % CARD.length]} ${lift}`}>
      <input type="radio" name={name} value={id} checked={checked} onChange={() => onPick(id)} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
      {checked ? <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-md bg-yellow-300 px-2 text-xs font-black text-slate-900">✔ 내 선택</span> : null}
      <span className="text-xl font-black" aria-hidden="true">{LETTERS[index] ?? index + 1}</span>
      <ChoicePicture targetId={targetId} choiceId={id} />
      <span className="mt-auto rounded-lg bg-black/30 p-2 text-[13px] font-bold leading-snug">{label}</span>
    </label>
  );
}

function Hints({ target, used, onHint }: { target: PredictionTarget; used: number; onHint: () => void }) {
  const shown = target.hints.slice(0, used);
  return (
    <div className="mt-3">
      <ol className="space-y-1 text-sm" aria-live="polite">{shown.map((h, i) => <li key={h} className="rounded-lg bg-violet-50 p-2 text-violet-950">💡 힌트 {i + 1}: {h}</li>)}</ol>
      {used >= 3 ? <p className="mt-1 text-sm text-slate-700">틀려도 괜찮아요. 예상과 결과가 다를 때 더 많이 배워요. 지금 생각을 골라 보세요.</p> : null}
      {used < 3 ? <button type="button" className="tap mt-2 rounded-full px-1 text-sm font-bold text-violet-700 underline-offset-2 hover:underline" onClick={onHint}>💡 잘 모르겠어요 · 힌트 {used + 1} 보기</button> : null}
    </div>
  );
}

function ChoiceSet({ target, choice, onPick }: { target: PredictionTarget; choice: string; onPick: (id: string) => void }) {
  const cols = COLS[target.choices.length] ?? "sm:grid-cols-4";
  return (
    <fieldset className="mt-1">
      <legend className="text-[15px] font-semibold text-violet-950">{target.question}</legend>
      <div className={`mt-6 grid grid-cols-2 gap-3 ${cols}`}>
        {target.choices.map((c, i) => <Card key={c.id} name={target.id} id={c.id} label={c.label} index={i} checked={choice === c.id} targetId={target.id} onPick={onPick} />)}
      </div>
    </fieldset>
  );
}

function Actions({ ready, onCancel }: { ready: boolean; onCancel: () => void }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button type="button" className="tap rounded-full bg-slate-100 px-4 text-slate-700" onClick={onCancel}>나중에</button>
      <button type="submit" className="tap rounded-full bg-gradient-to-r from-violet-700 to-pink-700 px-5 font-black text-white disabled:opacity-40" disabled={!ready}>이 카드로 결정 ✨</button>
    </div>
  );
}

function Head({ purpose }: { purpose: string }) {
  return (
    <>
      <span className="inline-block rounded-full bg-violet-100 px-3 py-0.5 text-xs font-extrabold text-violet-700">🃏 카드 1장 고르기</span>
      <h2 id="gate-title" className="mt-1 text-xl font-black text-violet-950">🤔 {purpose} 먼저 예상해 볼까요?</h2>
    </>
  );
}

export default function PredictionGate({ target, record, onHint, onSubmit, onCancel, purpose }: Props) {
  const [choice, setChoice] = useState(record?.choice ?? "");
  const [why, setWhy] = useState(record?.rationale ?? "");
  const [sketch, setSketch] = useState<Sketch>(record?.sketch ?? Array.from({ length: target.sketch?.points ?? 0 }, () => null));
  const ready = choice !== "" && why.trim().length >= 5;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready) onSubmit(choice, why.trim(), sketch.some((v) => v !== null) ? sketch : undefined);
  };
  return (
    <Modal labelledBy="gate-title" onClose={onCancel} backdrop="bg-gradient-to-br from-violet-950/85 via-pink-900/80 to-amber-700/75" panel="max-w-3xl rounded-[26px] bg-white p-5 shadow-2xl sm:p-6">
      <form onSubmit={submit}>
        <Head purpose={purpose} />
        <ChoiceSet target={target} choice={choice} onPick={setChoice} />
        <label className="mt-5 block text-sm font-extrabold text-violet-700" htmlFor="gate-why">✍️ 왜 그렇게 생각했나요? (이 카드를 고른 까닭, 5자 이상)</label>
        <input id="gate-why" className="tap mt-1 w-full rounded-xl border-2 border-violet-200 bg-violet-50/50 px-3" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="왜냐하면 …" maxLength={200} />
        {target.sketch ? <SketchPad spec={target.sketch} value={sketch} onChange={setSketch} /> : null}
        <Hints target={target} used={record?.hintsUsed ?? 0} onHint={onHint} />
        <Actions ready={ready} onCancel={onCancel} />
      </form>
    </Modal>
  );
}
