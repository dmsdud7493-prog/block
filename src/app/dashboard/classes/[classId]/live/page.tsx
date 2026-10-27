/** T-04 실시간 보드 — 과제별 학생 행 + 4카드 + 마감 조정 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { classBoard } from "@/lib/server/dashboard";
import FourCards from "@/components/teacher/FourCards";
import LiveBoard from "@/components/teacher/LiveBoard";
import LiveRefresh from "@/components/teacher/LiveRefresh";
import DueControl from "@/components/teacher/DueControl";

export const metadata: Metadata = { title: "실시간 보드" };

interface Props { params: Promise<{ classId: string }>; searchParams: Promise<{ assignment?: string }> }

async function load({ params, searchParams }: Props) {
  try {
    const [{ classId }, { assignment }] = await Promise.all([params, searchParams]);
    return await classBoard(classId, assignment ?? null);
  } catch {
    return null;
  }
}

export default async function LivePage(props: Props) {
  const board = await load(props);
  if (!board) notFound();
  const base = `/dashboard/classes/${board.classId}/live`;
  return (
    <main id="main" className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">🛰 {board.className} 실시간 보드</h1>
        <LiveRefresh classIds={[board.classId]} generatedAt={board.generatedAt} />
      </div>
      <nav aria-label="과제 고르기" className="flex flex-wrap gap-2 text-sm">
        {board.assignments.map((a) => <Link key={a.id} href={`${base}?assignment=${a.id}`} aria-current={a.id === board.assignment?.id ? "page" : undefined} className={`tap flex items-center rounded border px-3 ${a.id === board.assignment?.id ? "border-brand bg-brand text-white" : "border-line"}`}>{a.title}</Link>)}
      </nav>
      {board.assignment ? <DueControl key={board.assignment.id} assignment={board.assignment} /> : <p>반 관리에서 실험을 먼저 배정하세요.</p>}
      {board.assignment ? <LiveBoard folds={board.folds} submissionIdOf={board.submissionIdOf} title={board.assignment.title} /> : null}
      {board.assignment ? <FourCards board={board} /> : null}
    </main>
  );
}
