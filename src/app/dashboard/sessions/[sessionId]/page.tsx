/** 학생 상세 — 블록·실행/그래프·예상·AI 대화 (지침 5.1, R6) */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sessionDetail } from "@/lib/server/dashboard";
import SessionTabs, { type TabId } from "@/components/teacher/SessionTabs";

export const metadata: Metadata = { title: "학생 기록" };

interface Props { params: Promise<{ sessionId: string }>; searchParams: Promise<{ tab?: string }> }
const TAB_IDS: TabId[] = ["blocks", "runs", "predictions", "chat"];

async function load({ params, searchParams }: Props) {
  try {
    const [{ sessionId }, { tab }] = await Promise.all([params, searchParams]);
    const detail = await sessionDetail(sessionId);
    return detail ? { detail, tab: TAB_IDS.find((t) => t === tab) ?? "blocks" } : null;
  } catch {
    return null;
  }
}

export default async function SessionPage(props: Props) {
  const data = await load(props);
  if (!data) notFound();
  const { detail, tab } = data;
  return (
    <main id="main" className="mx-auto max-w-5xl space-y-3 p-4">
      <p className="text-sm"><Link className="underline" href={`/dashboard/classes/${detail.classId}/live`}>← 실시간 보드</Link></p>
      <h1 className="text-2xl font-bold">{detail.studentNo} · {detail.title}</h1>
      <p className="text-sm text-muted">시작 {new Date(detail.startedAt).toLocaleString("ko-KR")} · 상태 {detail.status}{detail.submissionId ? <> · <Link className="underline" href={`/dashboard/submissions/${detail.submissionId}`}>보고서 채점하기</Link></> : null}</p>
      <SessionTabs detail={detail} initial={tab} />
    </main>
  );
}
