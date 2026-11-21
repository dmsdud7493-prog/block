/** T-05 제출물 열람·루브릭 채점·코멘트·돌려주기 (지침 6.3, R11) */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { submissionDetail } from "@/lib/server/dashboard";
import ReportReadOnly from "@/components/teacher/ReportReadOnly";
import RubricGrader from "@/components/teacher/RubricGrader";
import PrintButton from "@/components/teacher/PrintButton";
import NavButton, { NavRow } from "@/components/teacher/NavButton";
import LiveRefresh from "@/components/teacher/LiveRefresh";

export const metadata: Metadata = { title: "보고서 채점" };

async function load(params: Promise<{ submissionId: string }>) {
  try {
    return await submissionDetail((await params).submissionId);
  } catch {
    return null;
  }
}

export default async function SubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const d = await load(params);
  if (!d) notFound();
  const meta = `${new Date(d.submittedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 제출 · ${d.version}번째 제출${d.late ? " · 마감 뒤" : ""}`;
  return (
    <main id="main" className="mx-auto max-w-6xl space-y-3 p-4">
      <NavRow><NavButton href={`/dashboard/classes/${d.classId}/live`}>← 실시간 보드</NavButton><NavButton href={`/dashboard/sessions/${d.sessionId}`}>🔬 실험 기록 보기</NavButton><NavButton href={`/dashboard/classes/${d.classId}/reports`}>📚 반 보고서 모아 보기</NavButton><PrintButton label="🖨 이 보고서 인쇄" /></NavRow>
      <h1 className="text-2xl font-bold">📝 {d.studentNo} · {d.title} 보고서</h1>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm text-muted">{meta}</p><LiveRefresh classIds={[d.classId]} generatedAt={d.loadedAt ?? 0} /></div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] print:block">
        <ReportReadOnly content={d.content} aiAssisted={d.aiAssisted} />
        <div className="print:hidden"><RubricGrader key={`${d.version}-${d.status}`} detail={d} /></div>
      </div>
    </main>
  );
}
