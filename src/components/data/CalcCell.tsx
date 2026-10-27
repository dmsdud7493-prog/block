"use client";
/**
 * 계산값 입력 칸 (요구사항 10, 지침 5.3) — 서버가 채점하고 오류 유형별 안내만 돌려준다.
 * 형성평가: 재시도 무제한, 정답값은 보여 주지 않는다. 피드백은 aria-live로 읽어 준다.
 */
import { useState } from "react";
import type { CalcRequest } from "@/lib/engine/types";
import type { CalcEntry } from "@/components/lab/types";
import { unitOptions } from "./units";

interface Props {
  request: CalcRequest;
  entry: CalcEntry | undefined;
  onCheck: (value: number, unit: string) => Promise<void>;
}

function Feedback({ entry }: { entry: CalcEntry | undefined }) {
  if (!entry || entry.correct === null) return <p className="min-h-5 text-xs" aria-live="polite" />;
  if (entry.correct) return <p className="text-sm font-semibold text-ok" aria-live="polite">✓ 좋아요! 계산이 맞아요.</p>;
  return <p className="text-sm text-warn" aria-live="polite">💡 {entry.hint} <span className="text-muted">(도전 {entry.attempts}번째 · 몇 번이든 다시 해 볼 수 있어요)</span></p>;
}

function UnitSelect({ id, options, value, onChange, disabled }: { id: string; options: string[]; value: string; onChange: (u: string) => void; disabled: boolean }) {
  return (
    <select id={id} className="tap rounded border border-line px-1" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">단위</option>
      {options.map((u) => <option key={u} value={u}>{u}</option>)}
    </select>
  );
}

export default function CalcCell({ request, entry, onCheck }: Props) {
  const options = unitOptions(request.unit, request.key);
  const [value, setValue] = useState(entry?.value ?? "");
  const [unit, setUnit] = useState(entry?.unit ?? "");
  const [busy, setBusy] = useState(false);
  const id = `calc-${request.key.replace(/\W/g, "_")}`;
  const submit = async () => {
    setBusy(true);
    try {
      await onCheck(Number(value.replace(",", ".")), unit);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <label htmlFor={id} className="sr-only">{request.label} 값</label>
        <input id={id} inputMode="decimal" className="tap w-24 rounded border border-line px-2" value={value} onChange={(e) => setValue(e.target.value)} disabled={entry?.correct === true} />
        <label htmlFor={`${id}-u`} className="sr-only">{request.label} 단위</label>
        <UnitSelect id={`${id}-u`} options={options} value={unit} onChange={setUnit} disabled={entry?.correct === true} />
        <button type="button" className="tap rounded bg-brand px-3 text-sm font-bold text-white disabled:opacity-50" onClick={submit} disabled={busy || !value || !unit || entry?.correct === true}>확인</button>
      </div>
      <Feedback entry={entry} />
    </div>
  );
}
