/** S-02~S-08 학생 실험 세션 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { loadSessionView } from "@/lib/server/hydrate";
import SessionLab from "@/components/lab/SessionLab";

export const metadata: Metadata = { title: "실험하기" };

async function load(params: Promise<{ sessionId: string }>) {
  try {
    const { sessionId } = await params;
    return await loadSessionView(sessionId);
  } catch {
    return null;
  }
}

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const view = await load(params);
  if (!view) notFound();
  // 보고서 머리에 제출자(학번)를 적는다 — 학생 display_name은 학번/번호(실명 아님, 규칙 5)
  return <SessionLab view={view} author={user.role === "student" ? user.displayName : undefined} />;
}
