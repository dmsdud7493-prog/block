"use client";
/**
 * 탐구 흐름 스테퍼 — 전체 흐름과 현재 단계를 한 화면에 (지침 1.4).
 * 남색 머리줄 위에 놓이는 미션 진행 막대: 지금 단계는 흰 알약, 마친 단계는 ⭐, 잠긴 단계는 🔒 (색만으로 구분하지 않는다).
 */
import { PHASES, type Phase } from "@/components/lab/types";

interface Props {
  phase: Phase;
  done: Partial<Record<Phase, boolean>>;
  onSelect?: (p: Phase) => void;
  locked?: Partial<Record<Phase, string>>;
}

const ICON: Record<Phase, string> = { design: "🧩", predict: "🔮", run: "🧪", interpret: "📈", report: "📝" };

function toneOf(current: boolean, done: boolean, locked: boolean): string {
  if (current) return "border-white bg-white text-nav shadow-[0_3px_0_rgba(0,0,0,0.25)]";
  if (done) return "border-mint bg-nav-2 text-white";
  if (locked) return "border-white/20 bg-transparent text-[#aebccb]";
  return "border-white/40 bg-transparent text-[#e2e8f0] hover:bg-white/10";
}

function StepItem({ id, label, index, current, done, lockReason, onSelect }: {
  id: Phase; label: string; index: number; current: boolean; done: boolean; lockReason?: string; onSelect?: (p: Phase) => void;
}) {
  const state = current ? "현재 단계" : done ? "완료" : lockReason ? "잠김" : "";
  const mark = lockReason && !current ? "🔒" : done && !current ? "⭐" : ICON[id];
  return (
    <li className="min-w-0 flex-1">
      <button
        type="button"
        className={`tap flex w-full items-center justify-center gap-1 rounded-full border-2 px-2 py-1 text-sm font-bold transition ${toneOf(current, done, Boolean(lockReason))} disabled:cursor-not-allowed`}
        aria-current={current ? "step" : undefined}
        disabled={Boolean(lockReason) || !onSelect}
        title={lockReason}
        onClick={() => onSelect?.(id)}
      >
        <span aria-hidden="true" className={done && !current ? "pop-in" : undefined}>{mark}</span>
        <span className="truncate"><span aria-hidden="true">{index + 1}. </span>{label}</span>
        {state ? <span className="sr-only"> ({state}{lockReason ? `: ${lockReason}` : ""})</span> : null}
      </button>
    </li>
  );
}

export default function StepStepper({ phase, done, onSelect, locked }: Props) {
  const count = PHASES.filter((p) => done[p.id]).length;
  return (
    <nav aria-label="탐구 단계" className="flex items-center gap-2">
      <ol className="flex min-w-0 flex-1 gap-1.5">
        {PHASES.map((p, i) => <StepItem key={p.id} id={p.id} label={p.label} index={i} current={p.id === phase} done={Boolean(done[p.id])} lockReason={locked?.[p.id]} onSelect={onSelect} />)}
      </ol>
      <p className="hidden shrink-0 text-xs font-bold text-[#cbd5e1] 2xl:block">⭐ {count}/{PHASES.length}</p>
    </nav>
  );
}
