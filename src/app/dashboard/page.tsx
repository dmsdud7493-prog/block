/** T-03 교사 대시보드 — 반마다 최근 과제 기준 4카드 (D11). 이벤트가 들어오면 실시간으로 다시 그린다 */
import type { Metadata } from "next";
import Link from "next/link";
import { dashboardOverview } from "@/lib/server/dashboard";
import FourCards from "@/components/teacher/FourCards";
import LiveRefresh from "@/components/teacher/LiveRefresh";
import type { ClassBoard } from "@/lib/teacherTypes";

export const metadata: Metadata = { title: "교사 대시보드" };

async function load(): Promise<ClassBoard[]> {
  try {
    return await dashboardOverview();
  } catch {
    return [];
  }
}

function ClassSection({ board }: { board: ClassBoard }) {
  const live = `/dashboard/classes/${board.classId}/live${board.assignment ? `?assignment=${board.assignment.id}` : ""}`;
  return (
    <section aria-labelledby={`cls-${board.classId}`} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`cls-${board.classId}`} className="text-xl font-bold">{board.className} <span className="text-base font-normal text-muted">· {board.assignment?.title ?? "배정한 실험 없음"}</span></h2>
        <div className="flex gap-3 text-sm"><Link className="underline" href={live}>실시간 보드 →</Link><Link className="underline" href={`/dashboard/classes/${board.classId}`}>반 관리</Link></div>
      </div>
      {board.assignment ? <FourCards board={board} /> : <p className="text-sm">반 관리에서 실험을 배정하면 카드가 채워져요.</p>}
    </section>
  );
}

export default async function Dashboard() {
  const boards = await load();
  const generatedAt = boards[0]?.generatedAt ?? 0;
  return (
    <main id="main" className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">📊 대시보드</h1>
        {boards.length ? <LiveRefresh classIds={boards.map((b) => b.classId)} generatedAt={generatedAt} /> : null}
      </div>
      {boards.length === 0 ? <p>먼저 <Link href="/dashboard/classes" className="underline">반을 만들어</Link> 학생 계정을 준비하세요.</p> : null}
      {boards.map((b) => <ClassSection key={b.classId} board={b} />)}
    </main>
  );
}
