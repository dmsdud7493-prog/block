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
}

function Meta({ guide, draft }: { guide?: string; draft?: boolean }) {
  return (
    <span className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
      {guide ? <span>❓ {guide}</span> : null}
      {draft ? <span className="rounded bg-amber-100 px-1 font-semibold text-amber-900">초안 · 실험 기록에서 옮겼어요. 내 말로 고쳐 주세요</span> : null}
    </span>
  );
}

export default function SectionField({ id, label, value, onChange, guide, starter, draft, rows = 3, readOnly, maxLength = 1000 }: Props) {
  const insertStarter = () => onChange(value.trim() ? `${value}\n${starter}` : `${starter} `);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <Meta guide={guide} draft={draft} />
      <textarea id={id} rows={rows} value={value} readOnly={readOnly} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-line p-2 text-sm read-only:bg-slate-50" />
      {starter && !readOnly ? <button type="button" className="tap rounded border border-line px-2 text-xs" onClick={insertStarter}>✏️ 시작어 넣기: “{starter}”</button> : null}
    </div>
  );
}
