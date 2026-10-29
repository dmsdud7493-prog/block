"use client";
/** 과제 카드 목록 — 시작하면 세션을 만들고 실험 화면으로 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "./api";
import { MISSION, MISSION_FALLBACK } from "@/components/ui/missions";

export interface AssignmentItem {
  id: string;
  title: string;
  slug: string;
  className: string;
  dueAt: string | null;
  allowLate: boolean;
  sessionId: string | null;
  status: string | null;
}

const STATUS: Record<string, string> = { in_progress: "🏃 하는 중", submitted: "📮 제출함", returned: "💌 선생님이 돌려줌 · 고쳐서 다시 내요", resubmitted: "📮 다시 제출함" };

function Card({ a, canStart }: { a: AssignmentItem; canStart: boolean }) {
  const { push: navigate } = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const open = async () => {
    if (a.sessionId) return navigate(`/lab/${a.sessionId}`);
    try {
      const res = await postJson<{ sessionId: string }>("/api/session/start", { assignmentId: a.id });
      if (res.data) navigate(`/lab/${res.data.sessionId}`);
      else setMsg(res.error?.message ?? "시작하지 못했어요.");
    } catch {
      setMsg("시작하지 못했어요.");
    }
  };
  const m = MISSION[a.slug] ?? MISSION_FALLBACK;
  const due = a.dueAt ? new Date(a.dueAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "마감 없음";
  return (
    <li className={`flex flex-col rounded-2xl border-t-[6px] bg-panel p-4 shadow-sm ${m.tone}`}>
      <p className="flex items-center gap-3">
        <span aria-hidden="true" className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)] ${m.chip}`}>{m.icon}</span>
        <span className="font-display text-xl text-nav">{a.title}</span>
      </p>
      {m.hook ? <p className="mt-2 font-bold text-ink">“{m.hook}”</p> : null}
      <p className="mt-1 text-sm text-muted">{a.className} · 마감 {due}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{a.status ? STATUS[a.status] : "✨ 아직 시작 안 함"}</p>
      <button type="button" className="tap btn-sun mt-3 w-fit px-6" disabled={!canStart && !a.sessionId} onClick={() => void open()}>{a.sessionId ? "이어 하기 ▶" : "시작하기 ▶"}</button>
      {msg ? <p role="alert" className="mt-1 text-sm text-err">{msg}</p> : null}
    </li>
  );
}

export default function AssignmentList({ items, canStart }: { items: AssignmentItem[]; canStart: boolean }) {
  if (items.length === 0) return <p className="mt-6 rounded-2xl bg-panel p-6 text-center text-muted shadow-sm"><span aria-hidden="true" className="block text-4xl">🛸</span>아직 선생님이 내준 실험이 없어요.</p>;
  return <ul className="mt-4 grid gap-4 sm:grid-cols-2">{items.map((a) => <Card key={a.id} a={a} canStart={canStart} />)}</ul>;
}
