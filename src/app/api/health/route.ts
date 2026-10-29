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
    // 체험 모드에서 Claude 튜터를 쓰는지(꺼져 있으면 규칙 기반 "기본 도우미 응답")
    demoTutor: process.env.DEMO_TUTOR_ENABLED === "true",
    tutorModel: process.env.CLAUDE_MODEL_TUTOR || "claude-haiku-5-5",
  }, { headers: { "cache-control": "no-store" } });
}
