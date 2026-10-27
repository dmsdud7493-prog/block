/** T-03 교사 대시보드 — S7에서 4카드·실시간 보드로 확장 */
import type { Metadata } from "next";
import Link from "next/link";
import { teacherClasses } from "@/lib/server/teacher";

export const metadata: Metadata = { title: "교사 대시보드" };

async function loadClasses() {
  try {
    return await teacherClasses();
  } catch {
    return [];
  }
}

export default async function Dashboard() {
  const classes = await loadClasses();
  return (
    <main id="main" className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold">📊 대시보드</h1>
      {classes.length === 0 ? <p className="mt-3">먼저 <Link href="/dashboard/classes" className="underline">반을 만들어</Link> 학생 계정을 준비하세요.</p> : null}
      <ul className="mt-3 space-y-2">{classes.map((c) => <li key={c.id}><Link className="underline" href={`/dashboard/classes/${c.id}`}>{c.name}</Link> · 학생 {c.studentCount}명</li>)}</ul>
    </main>
  );
}
