"use client";
/**
 * AI 튜터 패널 (요구사항 1·3) — "AI 튜터예요 · 선생님이 볼 수 있어요" 상시 표시(R5), 대화는 aria-live로 읽어 준다.
 * 2분 동안 조작이 없으면 한 번만 먼저 말을 건다(지침 4.3). 답은 주지 않고 다음 한 단계를 함께 생각한다(지침 5.4).
 */
import { useEffect, useRef, useState } from "react";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { LabController } from "@/components/lab/useLabController";
import { latestRun } from "@/components/lab/state";
import { postJson } from "@/components/lab/api";
import { SUGGESTION_CHIPS } from "@/lib/tutor/chips";
import type { TutorResponse } from "@/lib/tutor/schemas";
import { buildTutorContext } from "./context";
import HintLadderBadge from "./HintLadderBadge";
import { useIdle } from "./useIdle";

export interface ChatMsg { role: "user" | "assistant"; content: string; hintLevel?: number; source?: string; nudge?: boolean }

interface Props {
  ctl: LabController;
  catalog: AnyCatalog;
  mode: "demo" | "session";
  sessionId?: string;
  seed?: string;
  initial?: ChatMsg[];
  reportSection?: string | null;
}

const GREETING: ChatMsg = { role: "assistant", content: "안녕하세요! 저는 실험을 함께 생각하는 AI 도우미예요. 답을 대신 알려 주기보다 질문으로 도와줄게요. 막히면 언제든 물어보세요.", hintLevel: -1 };

function Bubble({ m }: { m: ChatMsg }) {
  const mine = m.role === "user";
  return (
    <li className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${mine ? "self-end bg-brand text-white" : "self-start bg-slate-100"}`}>
      <span className="sr-only">{mine ? "나: " : "AI 도우미: "}</span>{m.content}
      {!mine && m.source === "local" ? <span className="mt-1 block text-[11px] text-muted">기본 도우미 응답</span> : null}
    </li>
  );
}

export default function TutorPanel({ ctl, catalog, mode, sessionId, seed, initial, reportSection = null }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(initial?.length ? initial : [GREETING]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudged, setNudged] = useState(Boolean(initial?.some((m) => m.nudge)));
  const lastHint = [...msgs].reverse().find((m) => m.role === "assistant" && typeof m.hintLevel === "number")?.hintLevel ?? -1;
  const idle = useIdle([ctl.state.programVersion, ctl.state.runs.length, ctl.state.predictions.length, Object.keys(ctl.state.calc).length, msgs.length]);
  const listRef = useRef<HTMLOListElement | null>(null);

  const ask = async (content: string, nudge = false) => {
    const outgoing: ChatMsg = { role: "user", content };
    const history = [...msgs.filter((m) => m !== GREETING), outgoing].slice(-24).map(({ role, content: c }) => ({ role, content: c }));
    if (!nudge) setMsgs((prev) => [...prev, outgoing]);
    setBusy(true);
    try {
      const context = buildTutorContext(ctl.state, catalog, { idleSeconds: idle.seconds(), lastHintLevel: lastHint, nudgeSent: nudged, reportSection });
      const res = await postJson<TutorResponse>("/api/tutor", { mode, slug: catalog.slug, sessionId, seed, runNo: latestRun(ctl.state)?.runNo ?? null, program: ctl.state.program, messages: history, context, nudge });
      const reply = res.data ? res.data.reply : res.error?.message ?? "지금은 답하기 어려워요. 잠시 후 다시 물어봐 주세요.";
      setMsgs((prev) => [...prev, { role: "assistant", content: reply, hintLevel: res.data?.hint_level, source: res.data?.source, nudge }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (nudged || busy) return undefined;
    const t = setInterval(() => {
      if (idle.seconds() >= 120 && !nudged) {
        setNudged(true);
        void ask("(시스템 알림: 학생이 2분 동안 조작하지 않았어요. 어디서 막혔는지 짧게 물어봐 주세요.)", true);
      }
    }, 10_000);
    return () => clearInterval(t);
  });

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [msgs.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    void ask(t);
  };

  return (
    <section aria-labelledby="tutor-title" className="flex h-full max-h-[760px] flex-col rounded-lg border border-line bg-panel p-2">
      <h2 id="tutor-title" className="font-bold">🤖 AI 실험 도우미</h2>
      <p className="text-xs text-muted">AI 튜터예요 · 틀린 말을 할 수도 있어요 · {mode === "session" ? "선생님이 대화를 볼 수 있어요" : "체험 모드 대화는 저장되지 않아요"}</p>
      <HintLadderBadge level={lastHint} />
      <ol ref={listRef} className="mt-2 flex min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto" aria-live="polite" aria-label="대화">{msgs.map((m, i) => <Bubble key={i} m={m} />)}</ol>
      {busy ? <p className="text-xs text-muted" role="status">도우미가 생각하는 중…</p> : null}
      <Chips chips={SUGGESTION_CHIPS[catalog.slug] ?? []} disabled={busy} onPick={(c) => void ask(c)} />
      <form onSubmit={submit} className="mt-2 flex gap-1">
        <label htmlFor="tutor-input" className="sr-only">도우미에게 물어보기</label>
        <input id="tutor-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="궁금한 점이나 내 생각을 적어 보세요" className="tap min-w-0 flex-1 rounded border border-line px-2 text-sm" />
        <button type="submit" disabled={busy || !text.trim()} className="tap rounded bg-brand px-3 font-bold text-white disabled:opacity-50" aria-label="보내기">➤</button>
      </form>
    </section>
  );
}

function Chips({ chips, disabled, onPick }: { chips: string[]; disabled: boolean; onPick: (c: string) => void }) {
  return <div className="mt-2 flex flex-wrap gap-1">{chips.map((c) => <button key={c} type="button" disabled={disabled} className="tap rounded-full border border-brand px-2 text-xs text-brand" onClick={() => onPick(c)}>{c}</button>)}</div>;
}
