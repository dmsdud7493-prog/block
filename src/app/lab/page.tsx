/** S-01 학생 과제 목록 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import AssignmentList, { type AssignmentItem } from "@/components/lab/AssignmentList";
import { logout } from "@/app/(auth)/login/actions";

export const metadata: Metadata = { title: "내 실험" };

async function loadAssignments(studentId: string): Promise<AssignmentItem[]> {
  try {
    return await queryAssignments(studentId);
  } catch {
    return [];
  }
}

async function queryAssignments(studentId: string): Promise<AssignmentItem[]> {
  const db = await createClient();
  const [{ data: asg }, { data: sess }] = await Promise.all([
    db.from("assignments").select("id, due_at, allow_late, classes(name), experiments(slug, title)").order("created_at", { ascending: false }),
    db.from("sessions").select("id, assignment_id, status").eq("student_id", studentId),
  ]);
  return (asg ?? []).map((a) => {
    const exp = a.experiments as unknown as { slug: string; title: string };
    const s = (sess ?? []).find((x) => x.assignment_id === a.id);
    return { id: a.id, title: exp.title, slug: exp.slug, className: (a.classes as unknown as { name: string }).name, dueAt: a.due_at, allowLate: a.allow_late, sessionId: s?.id ?? null, status: s?.status ?? null };
  });
}

function StudentHeader({ name }: { name: string }) {
  return (
    <header className="bg-nav text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <h1 className="font-display text-2xl">🧪 {name}번의 실험 미션</h1>
        <form action={logout}><button type="submit" className="tap rounded-full border-2 border-white/60 px-4 text-sm font-bold text-white hover:bg-white/10">나가기</button></form>
      </div>
    </header>
  );
}

export default async function LabHome() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/dashboard");
  const items = await loadAssignments(user.id);
  return (
    <>
      <StudentHeader name={user.displayName} />
      <main id="main" className="mx-auto max-w-4xl p-4 sm:p-8">
        {!user.consentOnFile ? <p role="status" className="rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm">보호자 동의서가 확인되면 실험을 시작할 수 있어요. 동의서를 선생님께 내 주세요.</p> : null}
        <AssignmentList items={items} canStart={user.consentOnFile} />
      </main>
    </>
  );
}
