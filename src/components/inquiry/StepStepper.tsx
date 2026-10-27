"use client";
/** 탐구 흐름 스테퍼 — 전체 흐름과 현재 단계를 한 화면에 (지침 1.4) */
import { PHASES, type Phase } from "@/components/lab/types";

interface Props {
  phase: Phase;
  done: Partial<Record<Phase, boolean>>;
  onSelect?: (p: Phase) => void;
  locked?: Partial<Record<Phase, string>>;
}

function StepItem({ id, label, index, current, done, lockReason, onSelect }: {
  id: Phase; label: string; index: number; current: boolean; done: boolean; lockReason?: string; onSelect?: (p: Phase) => void;
}) {
  const state = current ? "현재 단계" : done ? "완료" : lockReason ? "잠김" : "";
  const tone = current ? "border-brand bg-brand text-white" : done ? "border-ok bg-white text-ok" : "border-line bg-white text-muted";
  return (
    <li className="flex-1">
      <button
        type="button"
        className={`tap w-full rounded-lg border-2 px-2 py-1 text-sm font-semibold ${tone} disabled:cursor-not-allowed`}
        aria-current={current ? "step" : undefined}
        disabled={Boolean(lockReason) || !onSelect}
        title={lockReason}
        onClick={() => onSelect?.(id)}
      >
        <span aria-hidden="true">{done && !current ? "✓ " : `${index + 1}. `}</span>{label}
        {state ? <span className="sr-only"> ({state}{lockReason ? `: ${lockReason}` : ""})</span> : null}
      </button>
    </li>
  );
}

export default function StepStepper({ phase, done, onSelect, locked }: Props) {
  return (
    <nav aria-label="탐구 단계">
      <ol className="flex gap-2">
        {PHASES.map((p, i) => <StepItem key={p.id} id={p.id} label={p.label} index={i} current={p.id === phase} done={Boolean(done[p.id])} lockReason={locked?.[p.id]} onSelect={onSelect} />)}
      </ol>
    </nav>
  );
}
