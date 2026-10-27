"use client";
/**
 * S-06~S-08 탐구 보고서 화면 (요구사항 11·12·14). 왼쪽: 9항목 보고서·성찰·제출 / 오른쪽: 내 기록·AI 도우미
 */
import { useMemo, useState } from "react";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { LabController } from "@/components/lab/useLabController";
import { initialReport } from "@/lib/report/transcribe";
import type { ReportContent } from "@/lib/report/template";
import ReportForm from "./ReportForm";
import ReflectionForm from "./ReflectionForm";
import SubmitGate from "./SubmitGate";
import MyRecordsPanel from "./MyRecordsPanel";
import FeedbackBox, { type FeedbackData } from "./ReturnNoteBox";
import { useReport } from "./useReport";

export interface ReportViewProps {
  ctl: LabController;
  catalog: AnyCatalog;
  mode: "demo" | "session";
  sessionId?: string;
  saved: { content: Partial<ReportContent>; aiAssisted: string[] } | null;
  status: string;
  /** 선생님이 반환한 루브릭·코멘트 (세션 모드, 반환 후에만) */
  returnNote?: FeedbackData | null;
  onBack: () => void;
  tutor: (section: string | null) => React.ReactNode;
}

const SAVE_TEXT = { idle: "", saving: "저장 중…", saved: "자동 저장됨", error: "저장하지 못했어요 · 연결을 확인해 주세요" };

function StatusBar({ locked, submitted, saved, mode }: { locked: boolean; submitted: { late: boolean } | null; saved: keyof typeof SAVE_TEXT; mode: string }) {
  if (submitted) return <p role="status" className="rounded bg-emerald-100 p-2 text-sm font-semibold text-emerald-900">✅ 제출했어요{submitted.late ? " (마감 뒤 제출)" : ""}. 선생님이 확인하면 피드백이 와요.</p>;
  if (locked) return <p role="status" className="rounded bg-slate-100 p-2 text-sm">제출한 보고서예요. 선생님이 돌려주면 다시 고칠 수 있어요.</p>;
  return <p className="text-xs text-muted" aria-live="polite">{mode === "session" ? SAVE_TEXT[saved] : "체험 모드 — 저장되지 않아요"}</p>;
}

function Editor({ r, readOnly, mode, onFocusSection }: { r: ReturnType<typeof useReport>; readOnly: boolean; mode: "demo" | "session"; onFocusSection: (s: string) => void }) {
  return (
    <div className="space-y-4">
      <ReportForm content={r.content} update={r.update} readOnly={readOnly} onFocusSection={onFocusSection} />
      <ReflectionForm content={r.content} update={r.update} readOnly={readOnly} onFocusSection={onFocusSection} />
      <SubmitGate content={r.content} aiAssisted={r.aiAssisted} setAi={r.setAi} onSubmit={() => void r.submit()} error={r.submitError} mode={mode} locked={readOnly} />
    </div>
  );
}

export default function ReportView({ ctl, catalog, mode, sessionId, saved, status, returnNote = null, onBack, tutor }: ReportViewProps) {
  const locked = status === "submitted" || status === "resubmitted";
  const initial = useMemo(() => initialReport(catalog, ctl.state, saved?.content ?? null), [catalog, ctl.state, saved]);
  const r = useReport(initial, { sessionId, locked, initialAi: saved?.aiAssisted ?? [] });
  const [section, setSection] = useState<string | null>(null);
  const readOnly = locked || Boolean(r.submitted);
  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">📝 {catalog.title} 탐구 보고서</h1>
        <div className="flex gap-2"><button type="button" className="tap rounded border border-line px-3 text-sm" onClick={onBack}>← 실험으로 돌아가기</button><button type="button" className="tap rounded border border-line px-3 text-sm" onClick={() => window.print()}>🖨 인쇄</button></div>
      </header>
      <StatusBar locked={locked} submitted={r.submitted} saved={r.saved} mode={mode} />
      {returnNote ? <FeedbackBox data={returnNote} /> : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Editor r={r} readOnly={readOnly} mode={mode} onFocusSection={setSection} />
        <div className="space-y-3 print:hidden"><MyRecordsPanel catalog={catalog} state={ctl.state} />{tutor(section)}</div>
      </div>
    </div>
  );
}
