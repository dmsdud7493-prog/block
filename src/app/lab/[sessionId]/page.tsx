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
  return <SessionLab view={view} />;
}
