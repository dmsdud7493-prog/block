"use client";
/**
 * 교사 "도와줄까?" — 누르면 학생 화면 가운데에 말풍선이 뜬다(학생이 예/아니요로 답함). 답은 실시간 보드에 보인다.
 * (2026-11-18 사용자 요청, 지침 4.3)
 */
import type { StudentFold } from "@/lib/events/fold";
import { useAction } from "./useAction";

const STATE: Record<NonNullable<StudentFold["help"]>, string> = { offered: "💬 물어봤어요 · 답 기다림", yes: "🙋 도와 달래요!", no: "👍 혼자 해 볼게요" };

export default function HelpButton({ sessionId, help, studentNo }: { sessionId: string; help: StudentFold["help"]; studentNo: string }) {
  const act = useAction<{ offerId: string }>("/api/help");
  return (
    <span className="ml-1 inline-flex flex-wrap items-center gap-1">
      {help !== "offered" ? <button type="button" disabled={act.busy} onClick={() => void act.run({ action: "offer", sessionId })} aria-label={`${studentNo}에게 도와줄까? 묻기`} className="tap rounded-full border-2 border-brand bg-white px-2 text-xs font-bold text-brand disabled:opacity-50">🤝 도와줄까?</button> : null}
      {help ? <span className={`rounded px-1 text-xs font-semibold ${help === "yes" ? "bg-rose-100 text-rose-800" : "bg-slate-100"}`}>{STATE[help]}</span> : null}
      {act.error ? <span role="alert" className="text-xs text-err">{act.error}</span> : null}
    </span>
  );
}
