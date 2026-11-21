/** 반 보고서 모아 보기·인쇄 (2026-11-21) — 과제 하나에 제출된 보고서 모두를 한 화면에. 인쇄하면 학생마다 새 쪽에서 시작한다 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { classReports } from "@/lib/server/dashboard";
import ClassReportList from "@/components/teacher/ClassReportList";
import NavButton, { NavRow } from "@/components/teacher/NavButton";
import PrintButton from "@/components/teacher/PrintButton";

export const metadata: Metadata = { title: "보고서 모아 보기" };

interface Props { params: Promise<{ classId: string }>; searchParams: Promise<{ assignment?: string }> }

async function load({ params, searchParams }: Props) {
  try {
    const [{ classId }, { assignment }] = await Promise.all([params, searchParams]);
    return await classReports(classId, assignment ?? null);
  } catch {
    return null;
  }
}

export default async function ClassReportsPage(props: Props) {
  const data = await load(props);
  if (!data) notFound();
  const base = `/dashboard/classes/${data.classId}`;
  const cur = data.assignment?.id;
  return (
    <main id="main" className="mx-auto max-w-4xl space-y-4 p-4 print:max-w-none print:p-0">
      <NavRow><NavButton href={`${base}/live${cur ? `?assignment=${cur}` : ""}`}>← 실시간 보드</NavButton><NavButton href={base}>🏫 반 관리</NavButton></NavRow>
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-bold">📚 {data.className} 보고서 모아 보기</h1>
        {data.items.length ? <PrintButton label={`🖨 ${data.items.length}명 모두 인쇄 · PDF로 저장`} /> : null}
      </div>
      <nav aria-label="과제 고르기" className="flex flex-wrap gap-2 text-sm print:hidden">
        {data.assignments.map((a) => <Link key={a.id} href={`${base}/reports?assignment=${a.id}`} aria-current={a.id === cur ? "page" : undefined} className={`tap flex items-center rounded border px-3 ${a.id === cur ? "border-brand bg-brand text-white" : "border-line"}`}>{a.title}</Link>)}
      </nav>
      {data.assignment ? <ClassReportList data={data} /> : <p>반 관리에서 실험을 먼저 배정하세요.</p>}
    </main>
  );
}
