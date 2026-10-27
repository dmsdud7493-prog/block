/** 교사 영역 공통 — 교사만 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { logout } from "@/app/(auth)/login/actions";

function TeacherNav() {
  return (
    <nav aria-label="교사 메뉴" className="flex gap-3 text-sm font-semibold">
      <Link href="/dashboard" className="tap flex items-center">📊 대시보드</Link>
      <Link href="/dashboard/classes" className="tap flex items-center">🏫 반 관리</Link>
    </nav>
  );
}

async function safeUser() {
  try {
    return await currentUser();
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await safeUser();
  if (!user) redirect("/login?role=teacher");
  if (user.role === "student") redirect("/lab");
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-4 py-2">
        <TeacherNav />
        <form action={logout} className="flex items-center gap-2 text-sm"><span>{user.displayName} 선생님</span><button type="submit" className="tap rounded border border-line px-3">나가기</button></form>
      </header>
      {children}
    </div>
  );
}
