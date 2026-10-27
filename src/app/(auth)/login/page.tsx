import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import LoginForms from "./LoginForms";

export const metadata: Metadata = { title: "입장하기" };

async function roleOf(searchParams: Promise<{ role?: string }>): Promise<string | undefined> {
  try {
    return (await searchParams).role;
  } catch {
    return undefined;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const role = await roleOf(searchParams);
  const ready = isSupabaseConfigured();
  return (
    <main id="main" className="mx-auto max-w-xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold">🔬 물질의 특성 가상실험실 입장</h1>
      {!ready ? <p role="status" className="mt-3 rounded border border-amber-600 bg-amber-50 p-3 text-sm">학교 서버(Supabase)가 아직 연결되지 않았어요. 지금은 <Link href="/" className="underline">체험 모드</Link>만 쓸 수 있어요. 연결 방법은 DEPLOY.md를 보세요.</p> : null}
      <LoginForms initialRole={role === "teacher" ? "teacher" : "student"} />
      <p className="mt-6 text-xs text-muted"><Link href="/privacy" className="underline">개인정보 처리방침</Link> · <Link href="/netcheck" className="underline">학교 망 점검</Link></p>
    </main>
  );
}
