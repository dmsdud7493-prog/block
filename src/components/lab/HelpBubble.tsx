"use client";
/**
 * 선생님의 "도와줄까?" 말풍선 (2026-11-18 사용자 요청, 지침 4.3 적시 도움).
 * 학생 화면은 Realtime을 쓰지 않으므로(verify P6) 1분마다 짧게 물어본다(사용자 요청 2026-11-18). 창이 가려져 있으면 묻지 않는다.
 * 교사는 1분 동안 답이 없으면 다시 보낼 수 있다. 다시 보낸 물음(repeat)은 화난 선생님 얼굴과 다른 말로 뜬다(사용자 요청 2026-11-18).
 */
import { useEffect, useRef, useState } from "react";
import { postJson } from "./api";
import ScientistFace from "@/components/ui/ScientistFace";
import type { HelpPoll } from "@/lib/help/pending";

const POLL_MS = 60_000;
const ASK = "선생님이 도와줄까?";
export const ASK_AGAIN = "선생님이 가기 전에 빨리 시작하고\n큰 소리로 열심히 하고 있습니다!\n소리친다, 실시!";
const AFTER: Record<"yes" | "no", string> = {
  yes: "알겠어! 선생님이 곧 갈게.\n손을 번쩍 들고 기다려 줘 🙋",
  no: "멋져! 혼자 해 보다가 막히면 랩메이트에게 물어보거나 손을 들어 줘 💪",
};
type Offer = { id: string; repeat: boolean };

/** 선생님 캐리커처 — 처음엔 엄지 척, 다시 물을 때는 화난 얼굴. 위아래로 살짝 떠다닌다 */
export function HelpMascot({ angry = false }: { angry?: boolean }) {
  return <ScientistFace look={angry ? "teacher-angry" : "teacher"} size={104} className="float-y mx-auto" />;
}

function Choices({ yesRef, onAnswer }: { yesRef: React.RefObject<HTMLButtonElement | null>; onAnswer: (a: "yes" | "no") => void }) {
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
      <button ref={yesRef} type="button" onClick={() => onAnswer("yes")} className="tap rounded-full bg-brand px-4 font-bold text-white">🙋 예, 도와주세요</button>
      <button type="button" onClick={() => onAnswer("no")} className="tap rounded-full border-2 border-brand bg-white px-4 font-bold text-brand">💪 아니요, 혼자 할 수 있어요</button>
    </div>
  );
}

/** 1분마다 열린 물음을 묻는다(창이 가려져 있으면 쉰다) */
function usePendingOffer(sessionId: string, active: boolean, setOffer: (o: Offer) => void) {
  useEffect(() => {
    if (!active) return undefined;
    let stop = false;
    const poll = async () => {
      try {
        if (document.hidden) return;
        const res = await postJson<HelpPoll>("/api/help", { action: "poll", sessionId });
        const id = res.data?.offerId;
        if (!stop && id) setOffer({ id, repeat: Boolean(res.data?.repeat) });
      } catch {
        // 연결이 끊기면 다음에 다시 묻는다
      }
    };
    void poll();
    const t = setInterval(() => void poll(), POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [active, sessionId, setOffer]);
}

export default function HelpBubble({ sessionId, active }: { sessionId: string; active: boolean }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [after, setAfter] = useState<"yes" | "no" | null>(null);
  const yesRef = useRef<HTMLButtonElement | null>(null);
  usePendingOffer(sessionId, active, setOffer);

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
      const id = offer?.id;
      setOffer(null);
      setAfter(a);
      if (id) await postJson("/api/help", { action: "answer", offerId: id, answer: a });
    } catch {
      // 답을 못 보내도 화면은 닫는다(선생님 보드에는 '답 기다림'으로 남음)
    }
  };

  if (!offer && !after) return null;
  const angry = Boolean(offer?.repeat);
  const tone = angry ? "border-rose-500" : "border-sky";
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
      <div key={offer?.id ?? "after"} role={offer ? "alertdialog" : "status"} aria-labelledby="help-q" className={`pop-in pointer-events-auto relative max-w-sm rounded-3xl border-4 ${tone} bg-white px-5 py-4 text-center shadow-2xl`}>
        <HelpMascot angry={angry} />
        <p id="help-q" className={`mt-1 whitespace-pre-line text-lg font-extrabold ${angry ? "text-rose-700" : "text-nav"}`}>{offer ? (angry ? ASK_AGAIN : ASK) : AFTER[after!]}</p>
        {offer ? <Choices yesRef={yesRef} onAnswer={(a) => void answer(a)} /> : null}
        <span aria-hidden="true" className={`absolute -bottom-3 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-4 border-r-4 ${tone} bg-white`} />
      </div>
    </div>
  );
}
