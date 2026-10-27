/** 망 점검용 상태 확인 (R13) — 비밀 값은 돌려주지 않고 "설정됨/안 됨"만 알린다 */
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    region: process.env.VERCEL_REGION ?? "local",
    database: isSupabaseConfigured(),
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
  }, { headers: { "cache-control": "no-store" } });
}
