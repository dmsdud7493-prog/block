/** T-01 반 목록·만들기 */
import type { Metadata } from "next";
import Link from "next/link";
import { teacherClasses, type ClassSummary } from "@/lib/server/teacher";
import ClassCreateForm from "@/components/teacher/ClassCreateForm";

export const metadata: Metadata = { title: "반 관리" };

function ClassCard({ c }: { c: ClassSummary }) {
  return (
    <li className="rounded-lg border border-line bg-panel p-3">
      <Link href={`/dashboard/classes/${c.id}`} className="tap block">
        <span className="font-bold">{c.name}</span>
        <span className="block text-sm text-muted">반 코드 <code className="font-mono text-ink">{c.joinCode}</code> · 학생 {c.studentCount}명</span>
      </Link>
    </li>
  );
}

async function loadClasses() {
  try {
    return await teacherClasses();
  } catch {
    return [];
  }
}

export default async function ClassesPage() {
  const classes = await loadClasses();
  return (
    <main id="main" className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold">🏫 반 관리</h1>
      <ClassCreateForm />
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">{classes.map((c) => <ClassCard key={c.id} c={c} />)}</ul>
    </main>
  );
}
