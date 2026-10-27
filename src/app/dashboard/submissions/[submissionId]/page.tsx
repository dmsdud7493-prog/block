/** T-05 제출물 열람·루브릭 채점·코멘트·돌려주기 (지침 6.3, R11) */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { submissionDetail } from "@/lib/server/dashboard";
import ReportReadOnly from "@/components/teacher/ReportReadOnly";
import RubricGrader from "@/components/teacher/RubricGrader";

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
  const meta = `${new Date(d.submittedAt).toLocaleString("ko-KR")} 제출 · ${d.version}번째 제출${d.late ? " · 마감 뒤" : ""}`;
  return (
    <main id="main" className="mx-auto max-w-6xl space-y-3 p-4">
      <p className="text-sm"><Link className="underline" href={`/dashboard/classes/${d.classId}/live`}>← 실시간 보드</Link> · <Link className="underline" href={`/dashboard/sessions/${d.sessionId}`}>실험 기록 보기</Link></p>
      <h1 className="text-2xl font-bold">📝 {d.studentNo} · {d.title} 보고서</h1>
      <p className="text-sm text-muted">{meta}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ReportReadOnly content={d.content} aiAssisted={d.aiAssisted} />
        <RubricGrader detail={d} />
      </div>
    </main>
  );
}
