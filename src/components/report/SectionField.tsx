"use client";
/** 보고서 한 칸 — 안내 질문 1개, 시작어 1개(넣기 버튼), 자동으로 옮긴 칸은 "초안" 표시 (지침 5.4·6.2) */
import { splitStep } from "@/lib/report/marks";

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
  /** 과정 칸 — 읽기·인쇄 화면에서 줄 앞 "1." "11."을 같은 모양의 동그라미 번호로 그린다 */
  numbered?: boolean;
}

/** 번호 줄 — 글꼴에 기대지 않고 직접 그린 동그라미 번호라 1번과 11번의 모양이 같다 */
function StepLine({ line }: { line: string }) {
  const { n, text } = splitStep(line);
  if (n === null) return <span className="block min-h-[1.25rem]">{line}</span>;
  return (
    <span className="flex items-start gap-1.5">
      <span className="mt-0.5 inline-flex h-[1.15rem] min-w-[1.15rem] shrink-0 items-center justify-center rounded-full bg-ink px-[0.2rem] text-[0.68rem] font-bold leading-none text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"><span className="sr-only">{n}번 </span><span aria-hidden="true">{n}</span></span>
      <span className="min-w-0">{text}</span>
    </span>
  );
}

const StepLines = ({ value }: { value: string }) => <>{value.trim().split("\n").map((line, i) => <StepLine key={`${i}-${line}`} line={line} />)}</>;

function Meta({ guide, draft }: { guide?: string; draft?: boolean }) {
  return (
    <span className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted print:hidden">
      {guide ? <span>❓ {guide}</span> : null}
      {draft ? <span className="rounded bg-amber-100 px-1 font-semibold text-amber-900">초안 · 실험 기록에서 옮겼어요. 내 말로 고쳐 주세요</span> : null}
    </span>
  );
}

/** 읽기 화면(제출 뒤·교사) — 입력 칸 대신 쓴 글을 그대로 보여 준다 */
function ReadView({ id, label, value, ariaLabel, numbered }: { id: string; label: string; value: string; ariaLabel?: string; numbered?: boolean }) {
  return (
    <div className="space-y-1">
      {label ? <p className="text-sm font-semibold" id={`${id}-label`}><LabelText label={label} /></p> : null}
      <p id={id} aria-labelledby={label ? `${id}-label` : undefined} aria-label={label ? undefined : ariaLabel} className="min-h-[2rem] whitespace-pre-wrap rounded border border-dashed border-line bg-white p-2 text-sm print:min-h-0 print:border-0 print:p-0">{numbered && value.trim() ? <StepLines value={value} /> : value.trim() || "—"}</p>
    </div>
  );
}

/** 칸 이름 — 괄호 속 도움말("(자료 몇 번의…)")은 인쇄할 때 뺀다 */
function LabelText({ label }: { label: string }) {
  const at = label.indexOf(" (");
  if (at < 0) return <>{label}</>;
  return <>{label.slice(0, at)}<span className="print:hidden">{label.slice(at)}</span></>;
}

/** 인쇄용 — 학생이 쓴 글만 */
const PrintText = ({ value, numbered }: { value: string; numbered?: boolean }) => <p className="hidden min-h-[1.5rem] whitespace-pre-wrap text-sm leading-relaxed print:block">{numbered ? <StepLines value={value} /> : value.trim()}</p>;

export default function SectionField({ id, label, value, onChange, guide, starter, draft, rows = 3, readOnly, maxLength = 1000, ariaLabel, numbered }: Props) {
  if (readOnly) return <ReadView id={id} label={label} value={value} ariaLabel={ariaLabel} numbered={numbered} />;
  const insertStarter = () => onChange(value.trim() ? `${value}\n${starter}` : `${starter} `);
  return (
    <div className="space-y-1">
      {label ? <label htmlFor={id} className="block text-sm font-semibold"><LabelText label={label} /></label> : null}
      <Meta guide={guide} draft={draft} />
      <textarea id={id} aria-label={label ? undefined : ariaLabel} rows={rows} style={{ minHeight: `${rows * 1.25 + 1.1}rem` }} value={value} readOnly={readOnly} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-line p-2 text-sm [field-sizing:content] max-h-[28rem] read-only:bg-slate-50 print:hidden" />
      <PrintText value={value} numbered={numbered} />
      {starter && !readOnly ? <button type="button" className="tap rounded border border-line px-2 text-xs print:hidden" onClick={insertStarter}>✏️ 시작어 넣기: “{starter}”</button> : null}
    </div>
  );
}
