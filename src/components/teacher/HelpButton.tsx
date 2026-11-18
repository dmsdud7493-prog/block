"use client";
/**
 * 교사 "도와줄까?" — 누르면 학생 화면 가운데에 말풍선이 뜬다(학생이 예/아니요로 답함). 답은 실시간 보드에 보인다.
 * (2026-11-18 사용자 요청, 지침 4.3) 1분 동안 답이 없으면 한 번 더 보낼 수 있고, 두 번째 물음은 학생 화면에 화난 선생님으로 뜬다.
 */
import { useEffect, useState } from "react";
import type { StudentFold } from "@/lib/events/fold";
import { HELP_OPEN_SEC } from "@/lib/events/fold";
import { useAction } from "./useAction";

type Help = StudentFold["help"];
const STATE: Record<NonNullable<Help>, string> = { offered: "💬 물어봤어요 · 답 기다림", silent: "😶 1분 넘게 답 없음", yes: "🙋 도와 달래요!", no: "👍 혼자 해 볼게요" };

/** 보드가 새로 그려지기 전에도 1분이 지나면 '다시 보내기'가 나타나게 */
function useLiveHelp(help: Help, helpAt: string | null): Help {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (help !== "offered" || !helpAt) return undefined;
    const left = Date.parse(helpAt) + HELP_OPEN_SEC * 1000 - Date.now();
    const t = setTimeout(() => setLate(true), Math.max(0, left));
    return () => {
      clearTimeout(t);
      setLate(false);
    };
  }, [help, helpAt]);
  return help === "offered" && late ? "silent" : help;
}

function chipText(help: NonNullable<Help>, tries: number): string {
  return help === "offered" && tries >= 2 ? "😠 한 번 더 물어봤어요 · 답 기다림" : STATE[help];
}

export default function HelpButton({ sessionId, help, helpAt = null, tries = 0, studentNo }: { sessionId: string; help: Help; helpAt?: string | null; tries?: number; studentNo: string }) {
  const act = useAction<{ offerId: string }>("/api/help");
  const now = useLiveHelp(help, helpAt);
  const again = now === "silent";
  return (
    <span className="ml-1 inline-flex flex-wrap items-center gap-1">
      {now !== "offered" ? <button type="button" disabled={act.busy} onClick={() => void act.run({ action: "offer", sessionId })} aria-label={`${studentNo}에게 ${again ? "한 번 더 " : ""}도와줄까? 묻기`} className={`tap rounded-full border-2 bg-white px-2 text-xs font-bold disabled:opacity-50 ${again ? "border-rose-600 text-rose-700" : "border-brand text-brand"}`}>{again ? "🤝 한 번 더 도와줄까?" : "🤝 도와줄까?"}</button> : null}
      {now ? <span className={`rounded px-1 text-xs font-semibold ${now === "yes" ? "bg-rose-100 text-rose-800" : "bg-slate-100"}`}>{chipText(now, tries)}</span> : null}
      {act.error ? <span role="alert" className="text-xs text-err">{act.error}</span> : null}
    </span>
  );
}
