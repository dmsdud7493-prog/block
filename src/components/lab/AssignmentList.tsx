"use client";
/** 과제 카드 목록 — 시작하면 세션을 만들고 실험 화면으로 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "./api";

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

const STATUS: Record<string, string> = { in_progress: "하는 중", submitted: "제출함", returned: "선생님이 돌려줌 · 고쳐서 다시 내요", resubmitted: "다시 제출함" };

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
  const due = a.dueAt ? new Date(a.dueAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "마감 없음";
  return (
    <li className="rounded-lg border border-line bg-panel p-3">
      <p className="font-bold">{a.title}</p>
      <p className="text-sm text-muted">{a.className} · 마감 {due} · {a.status ? STATUS[a.status] : "아직 시작 안 함"}</p>
      <button type="button" className="tap mt-2 rounded bg-brand px-4 font-bold text-white disabled:opacity-50" disabled={!canStart && !a.sessionId} onClick={() => void open()}>{a.sessionId ? "이어 하기" : "시작하기"}</button>
      {msg ? <p role="alert" className="mt-1 text-sm text-err">{msg}</p> : null}
    </li>
  );
}

export default function AssignmentList({ items, canStart }: { items: AssignmentItem[]; canStart: boolean }) {
  if (items.length === 0) return <p className="mt-6 text-muted">아직 선생님이 내준 실험이 없어요.</p>;
  return <ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((a) => <Card key={a.id} a={a} canStart={canStart} />)}</ul>;
}
