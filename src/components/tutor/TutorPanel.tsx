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
import { editorDiagnostics } from "@/components/lab/editorDiagnostics";
import { useIdle } from "./useIdle";

export interface ChatMsg { role: "user" | "assistant"; content: string; hintLevel?: number; source?: string; nudge?: boolean; notice?: boolean }

interface Props {
  ctl: LabController;
  catalog: AnyCatalog;
  mode: "demo" | "session";
  sessionId?: string;
  seed?: string;
  initial?: ChatMsg[];
  reportSection?: string | null;
  /** 교사 설정: 편집 중 점검을 숨긴 수업이면 튜터에게도 숨긴다 */
  hintLevelEditing?: "none" | "slots" | "all";
  /** 대화 맨 앞에 보이는 안내 말풍선(대화 기록·Claude 요청에는 넣지 않는다) — 예: 체험 모드는 기본 도우미만 */
  notice?: string;
}

/** 첫인사 — 유머 한 스푼 + 자신감 북돋우기. 실험마다 다르게 (규칙 2 학습 안전) */
const greet = (content: string): ChatMsg => ({ role: "assistant", content, hintLevel: -1 });
const GREETINGS: Record<string, ChatMsg> = {
  density: greet("어서 와! 밀도 측정 실험은 처음이지? 철조각이 물에 퐁당 빠지는 순간, 너는 이미 과학자야. 잘할 수 있을 거야. 막히면 내가 도와줄게, 화이팅! 💪"),
  solubility: greet("어서 와! 용해도 측정 실험은 처음이지? 가루가 물속으로 사라지는 마술, 오늘은 네가 마술사야. 잘할 수 있을 거야. 막히면 내가 도와줄게, 화이팅! ✨"),
  boiling: greet("어서 와! 끓는점 측정 실험은 처음이지? 보글보글 끓는 건 라면만이 아니라는 걸 보여 주자. 잘할 수 있을 거야. 막히면 내가 도와줄게, 화이팅! 🔥"),
  melting: greet("어서 와! 녹는점 측정 실험은 처음이지? 아이스크림 녹는 건 슬프지만, 이 실험에서 녹는 건 신나는 일이야. 잘할 수 있을 거야. 막히면 내가 도와줄게, 화이팅! 🍦"),
  separation1: greet("어서 와! 끓는점 차로 혼합물을 나누는 실험은 처음이지? 물과 에탄올, 사이좋던 둘을 떼어 놓는 건 미안하지만 과학을 위해서야. 잘할 수 있을 거야. 막히면 내가 도와줄게, 화이팅! 🧪"),
  separation2: greet("어서 와! 용해도 차로 혼합물을 나누는 실험은 처음이지? 반짝이는 결정을 건져 내면 보물찾기 성공이야. 잘할 수 있을 거야. 막히면 내가 도와줄게, 화이팅! 💎"),
};
const GREETING_DEFAULT = greet("어서 와! 이 실험은 처음이지? 잘할 수 있을 거야. 막히면 내가 도와줄게, 화이팅! 💪");

function Bubble({ m }: { m: ChatMsg }) {
  if (m.notice) {
    return <li className="self-stretch rounded-2xl border-2 border-dashed border-white bg-[#fff8dc] px-3 py-2 text-sm font-semibold leading-relaxed text-[#5c4700] shadow-sm"><span className="sr-only">안내: </span>{m.content}</li>;
  }
  const mine = m.role === "user";
  return (
    <li className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${mine ? "self-end rounded-br-sm bg-nav-2 text-white" : "self-start rounded-bl-sm border border-black/5 bg-white text-ink"}`}>
      <span className="sr-only">{mine ? "나: " : "AI 도우미: "}</span>{m.content}
      {!mine && m.source === "local" ? <span className="mt-1 block text-[11px] text-muted">기본 도우미 응답</span> : null}
    </li>
  );
}

export default function TutorPanel({ ctl, catalog, mode, sessionId, seed, initial, reportSection = null, hintLevelEditing = "all", notice }: Props) {
  const GREETING = GREETINGS[catalog.slug] ?? GREETING_DEFAULT;
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [...(notice ? [{ role: "assistant" as const, content: notice, notice: true }] : []), ...(initial?.length ? initial : [GREETING])]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudged, setNudged] = useState(Boolean(initial?.some((m) => m.nudge)));
  const lastHint = [...msgs].reverse().find((m) => m.role === "assistant" && typeof m.hintLevel === "number")?.hintLevel ?? -1;
  const idle = useIdle([ctl.state.programVersion, ctl.state.runs.length, ctl.state.predictions.length, Object.keys(ctl.state.calc).length, msgs.length]);
  const listRef = useRef<HTMLOListElement | null>(null);

  const ask = async (content: string, nudge = false) => {
    const outgoing: ChatMsg = { role: "user", content };
    const history = [...msgs.filter((m) => m !== GREETING && !m.notice), outgoing].slice(-24).map(({ role, content: c }) => ({ role, content: c }));
    if (!nudge) setMsgs((prev) => [...prev, outgoing]);
    setBusy(true);
    try {
      const visible = { ...ctl.state, diagnostics: editorDiagnostics(ctl.state.diagnostics, hintLevelEditing) };
      const context = buildTutorContext(visible, catalog, { idleSeconds: idle.seconds(), lastHintLevel: lastHint, nudgeSent: nudged, reportSection });
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
    // 페이지 전체가 아니라 대화 목록만 맨 아래로 (태블릿에서 화면이 튀지 않게)
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [msgs.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    void ask(t);
  };

  return (
    <section aria-labelledby="tutor-title" className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl bg-sky shadow-sm xl:rounded-none xl:shadow-none">
      <div className="bg-nav-2 px-4 py-3 text-white">
        <h2 id="tutor-title" className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#2ecc71]" />🤖 AI 실험 도우미</h2>
        <p className="mt-0.5 text-xs text-[#d6e4f0]">AI 튜터예요 · 틀린 말을 할 수도 있어요 · {mode === "session" ? "선생님이 대화를 볼 수 있어요" : "체험 모드 대화는 저장되지 않아요"}</p>
      </div>
      <div className="px-3 pt-2"><HintLadderBadge level={lastHint} /></div>
      <ol ref={listRef} className="flex min-h-[200px] flex-1 flex-col gap-2.5 overflow-y-auto p-3" aria-live="polite" aria-label="대화">{msgs.map((m, i) => <Bubble key={i} m={m} />)}</ol>
      {busy ? <p className="mx-3 mb-1 self-start rounded-full bg-white px-3 py-1 text-xs text-ink" role="status">도우미가 생각하는 중… 💭</p> : null}
      <Chips chips={SUGGESTION_CHIPS[catalog.slug] ?? []} disabled={busy} onPick={(c) => void ask(c)} />
      <form onSubmit={submit} className="flex gap-2 border-t border-white/60 bg-sky-deep p-3">
        <label htmlFor="tutor-input" className="sr-only">도우미에게 물어보기</label>
        <input id="tutor-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="실험에 대해 물어보세요…" className="tap min-w-0 flex-1 rounded-full border border-[#d5dae1] bg-white px-4 text-sm" />
        <button type="submit" disabled={busy || !text.trim()} className="tap rounded-full bg-brand font-bold text-white disabled:bg-[#9aa5b1]" aria-label="보내기">➤</button>
      </form>
    </section>
  );
}

function Chips({ chips, disabled, onPick }: { chips: string[]; disabled: boolean; onPick: (c: string) => void }) {
  return <div className="flex flex-wrap gap-1.5 px-3 pb-2">{chips.map((c) => <button key={c} type="button" disabled={disabled} className="tap rounded-full border border-[#d7e3fb] bg-[#eef3ff] px-3 text-xs font-semibold text-brand hover:bg-[#dfe9ff]" onClick={() => onPick(c)}>{c}</button>)}</div>;
}
