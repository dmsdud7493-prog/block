"use client";
/** 보고서 한 칸 — 안내 질문 1개, 시작어 1개(넣기 버튼), 자동으로 옮긴 칸은 "초안" 표시 (지침 5.4·6.2) */
interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  guide?: string;
  starter?: string;
  draft?: boolean;
  rows?: number;
  readOnly?: boolean;
  maxLength?: number;
  /** 칸 이름을 화면에 따로 쓰지 않을 때(활동지 왼쪽 칸 이름이 대신할 때) 읽어 줄 이름 */
  ariaLabel?: string;
}

function Meta({ guide, draft }: { guide?: string; draft?: boolean }) {
  return (
    <span className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
      {guide ? <span>❓ {guide}</span> : null}
      {draft ? <span className="rounded bg-amber-100 px-1 font-semibold text-amber-900">초안 · 실험 기록에서 옮겼어요. 내 말로 고쳐 주세요</span> : null}
    </span>
  );
}

/** 읽기 화면(제출 뒤·교사) — 입력 칸 대신 쓴 글을 그대로 보여 준다 */
function ReadView({ id, label, value, ariaLabel }: { id: string; label: string; value: string; ariaLabel?: string }) {
  return (
    <div className="space-y-1">
      {label ? <p className="text-sm font-semibold" id={`${id}-label`}>{label}</p> : null}
      <p id={id} aria-labelledby={label ? `${id}-label` : undefined} aria-label={label ? undefined : ariaLabel} className="min-h-[2rem] whitespace-pre-wrap rounded border border-dashed border-line bg-white p-2 text-sm">{value.trim() || "—"}</p>
    </div>
  );
}

export default function SectionField({ id, label, value, onChange, guide, starter, draft, rows = 3, readOnly, maxLength = 1000, ariaLabel }: Props) {
  if (readOnly) return <ReadView id={id} label={label} value={value} ariaLabel={ariaLabel} />;
  const insertStarter = () => onChange(value.trim() ? `${value}\n${starter}` : `${starter} `);
  return (
    <div className="space-y-1">
      {label ? <label htmlFor={id} className="block text-sm font-semibold">{label}</label> : null}
      <Meta guide={guide} draft={draft} />
      <textarea id={id} aria-label={label ? undefined : ariaLabel} rows={rows} value={value} readOnly={readOnly} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-line p-2 text-sm read-only:bg-slate-50" />
      {starter && !readOnly ? <button type="button" className="tap rounded border border-line px-2 text-xs" onClick={insertStarter}>✏️ 시작어 넣기: “{starter}”</button> : null}
    </div>
  );
}
