"use client";
/** 제출 체크리스트 (지침 6.4) — 조건을 채우기 전에는 버튼이 꺼져 있고, 서버도 같은 조건으로 다시 검사한다 */
import { SECTIONS, submitChecklist, type ReportContent } from "@/lib/report/template";

interface Props {
  content: ReportContent;
  aiAssisted: string[];
  setAi: (v: string[]) => void;
  onSubmit: () => void;
  error: string | null;
  mode: "demo" | "session";
  locked: boolean;
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return <li className={ok ? "text-ok" : "text-muted"}><span aria-hidden="true">{ok ? "✅" : "⬜"} </span><span className="sr-only">{ok ? "완료: " : "아직: "}</span>{label}</li>;
}

function AiHelp({ aiAssisted, setAi, locked }: { aiAssisted: string[]; setAi: (v: string[]) => void; locked: boolean }) {
  const toggle = (id: string) => setAi(aiAssisted.includes(id) ? aiAssisted.filter((x) => x !== id) : [...aiAssisted, id]);
  return (
    <fieldset className="mt-2 text-sm">
      <legend className="font-semibold">AI 도우미의 도움을 받은 칸이 있다면 표시해 주세요 (솔직하게 적으면 돼요)</legend>
      <div className="mt-1 flex flex-wrap gap-2">{SECTIONS.map((s) => <label key={s.id} className="tap flex items-center gap-1"><input type="checkbox" disabled={locked} checked={aiAssisted.includes(s.id)} onChange={() => toggle(s.id)} />{s.title.replace(/^\d+\.\s*/, "")}</label>)}</div>
    </fieldset>
  );
}

export default function SubmitGate({ content, aiAssisted, setAi, onSubmit, error, mode, locked }: Props) {
  const checks = submitChecklist(content);
  const ready = checks.every((c) => c.ok);
  return (
    <section aria-labelledby="submit-title" className="rounded-lg border-2 border-brand bg-panel p-3">
      <h2 id="submit-title" className="font-bold">📮 선생님께 제출하기</h2>
      <ul className="mt-1 space-y-1 text-sm" aria-live="polite">{checks.map((c) => <Check key={c.id} ok={c.ok} label={c.label} />)}</ul>
      <AiHelp aiAssisted={aiAssisted} setAi={setAi} locked={locked} />
      {error ? <p role="alert" className="mt-2 text-sm text-err">{error}</p> : null}
      {mode === "demo" ? <p className="mt-2 text-sm text-muted">체험 모드에서는 제출되지 않아요. 인쇄해서 확인해 볼 수 있어요.</p> : null}
      <button type="button" className="tap mt-2 w-full rounded-lg bg-brand font-bold text-white disabled:opacity-50" disabled={!ready || locked || mode === "demo"} onClick={onSubmit}>{ready ? "제출하기" : "체크리스트를 채우면 제출할 수 있어요"}</button>
    </section>
  );
}
