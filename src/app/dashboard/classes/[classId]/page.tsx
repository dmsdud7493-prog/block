/** T-01·T-02 반 상세: 학생 계정·PIN·보호자 동의, 실험 배정, 교사 설정 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classDetail } from "@/lib/server/teacher";
import StudentManager from "@/components/teacher/StudentManager";
import AssignForm from "@/components/teacher/AssignForm";
import ClassSettingsForm from "@/components/teacher/ClassSettingsForm";

export const metadata: Metadata = { title: "반 상세" };

async function load(params: Promise<{ classId: string }>) {
  try {
    return await classDetail((await params).classId);
  } catch {
    return null;
  }
}

export default async function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const cls = await load(params);
  if (!cls) notFound();
  return (
    <main id="main" className="mx-auto max-w-5xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">{cls.name} <span className="text-base font-normal text-muted">반 코드 <code className="font-mono text-ink">{cls.joinCode}</code></span></h1>
      <StudentManager classId={cls.id} joinCode={cls.joinCode} students={cls.students} />
      <AssignForm classId={cls.id} assignments={cls.assignments} />
      <ClassSettingsForm classId={cls.id} settings={cls.settings} />
    </main>
  );
}
