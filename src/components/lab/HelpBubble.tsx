"use client";
/**
 * 선생님의 "도와줄까?" 말풍선 (2026-11-18 사용자 요청, 지침 4.3 적시 도움).
 * 학생 화면은 Realtime을 쓰지 않으므로(verify P6) 1분마다 짧게 물어본다(사용자 요청 2026-11-18). 창이 가려져 있으면 묻지 않는다.
 */
import { useEffect, useRef, useState } from "react";
import { postJson } from "./api";

const POLL_MS = 60_000;
const AFTER: Record<"yes" | "no", string> = {
  yes: "알겠어! 선생님이 곧 갈게. 손을 번쩍 들고 기다려 줘 🙋",
  no: "멋져! 혼자 해 보다가 막히면 랩메이트에게 물어보거나 손을 들어 줘 💪",
};

/** 귀여운 선생님 캐릭터 — 동그란 얼굴, 반짝이는 큰 눈, 볼터치, 동글 안경, 손 흔들기와 하트 */
export function HelpMascot() {
  return (
    <svg viewBox="0 0 120 100" width="112" height="94" aria-hidden="true" className="float-y mx-auto">
      <path d="M96 14 c-4 -7 -14 -3 -10 5 l10 10 l10 -10 c4 -8 -6 -12 -10 -5z" fill="#fb7185" />
      <g fill="#fde68a"><path d="M18 18 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z" /><path d="M104 52 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5z" /></g>
      <path d="M30 42 Q30 10 60 10 Q90 10 90 42 Q84 26 60 26 Q36 26 30 42Z" fill="#7c4a2d" />
      <circle cx="60" cy="52" r="30" fill="#ffe0c2" stroke="#f2b98d" strokeWidth="2" />
      <path d="M31 46 Q36 22 60 22 Q84 22 89 46 Q78 32 60 33 Q42 32 31 46Z" fill="#7c4a2d" />
      <g fill="none" stroke="#475569" strokeWidth="2.5"><circle cx="47" cy="52" r="9" /><circle cx="73" cy="52" r="9" /><path d="M56 52 h8" /></g>
      <g fill="#1f2937"><circle cx="47" cy="52" r="5" /><circle cx="73" cy="52" r="5" /></g>
      <g fill="#fff"><circle cx="49" cy="50" r="2" /><circle cx="75" cy="50" r="2" /><circle cx="45.5" cy="54.5" r="1" /><circle cx="71.5" cy="54.5" r="1" /></g>
      <g fill="#fda4af" opacity=".8"><ellipse cx="38" cy="65" rx="6" ry="4" /><ellipse cx="82" cy="65" rx="6" ry="4" /></g>
      <path d="M52 68 Q60 78 68 68 Q60 72 52 68Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1.5" strokeLinejoin="round" />
      <g className="lab-wave"><circle cx="99" cy="76" r="9" fill="#ffe0c2" stroke="#f2b98d" strokeWidth="2" /><path d="M93 70 v-8 M99 68 v-9 M105 70 v-8" stroke="#f2b98d" strokeWidth="4" strokeLinecap="round" /></g>
    </svg>
  );
}

function Choices({ yesRef, onAnswer }: { yesRef: React.RefObject<HTMLButtonElement | null>; onAnswer: (a: "yes" | "no") => void }) {
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
      <button ref={yesRef} type="button" onClick={() => onAnswer("yes")} className="tap rounded-full bg-brand px-4 font-bold text-white">🙋 예, 도와주세요</button>
      <button type="button" onClick={() => onAnswer("no")} className="tap rounded-full border-2 border-brand bg-white px-4 font-bold text-brand">💪 아니요, 혼자 할 수 있어요</button>
    </div>
  );
}

export default function HelpBubble({ sessionId, active }: { sessionId: string; active: boolean }) {
  const [offer, setOffer] = useState<string | null>(null);
  const [after, setAfter] = useState<"yes" | "no" | null>(null);
  const yesRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    let stop = false;
    const poll = async () => {
      try {
        if (document.hidden) return;
        const res = await postJson<{ offerId: string | null }>("/api/help", { action: "poll", sessionId });
        if (!stop && res.data?.offerId) setOffer(res.data.offerId);
      } catch {
        // 연결이 끊기면 다음에 다시 묻는다
      }
    };
    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [active, sessionId]);

  useEffect(() => {
    if (offer) yesRef.current?.focus();
  }, [offer]);

  useEffect(() => {
    if (!after) return undefined;
    const t = setTimeout(() => setAfter(null), 6000);
    return () => clearTimeout(t);
  }, [after]);

  const answer = async (a: "yes" | "no") => {
    try {
      const id = offer;
      setOffer(null);
      setAfter(a);
      if (id) await postJson("/api/help", { action: "answer", offerId: id, answer: a });
    } catch {
      // 답을 못 보내도 화면은 닫는다(선생님 보드에는 '답 기다림'으로 남음)
    }
  };

  if (!offer && !after) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
      <div role={offer ? "alertdialog" : "status"} aria-labelledby="help-q" className="pop-in pointer-events-auto relative max-w-sm rounded-3xl border-4 border-sky bg-white px-5 py-4 text-center shadow-2xl">
        <HelpMascot />
        <p id="help-q" className="mt-1 text-lg font-extrabold text-nav">{offer ? "선생님이 도와줄까?" : AFTER[after!]}</p>
        {offer ? <Choices yesRef={yesRef} onAnswer={(a) => void answer(a)} /> : null}
        <span aria-hidden="true" className="absolute -bottom-3 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-4 border-r-4 border-sky bg-white" />
      </div>
    </div>
  );
}
