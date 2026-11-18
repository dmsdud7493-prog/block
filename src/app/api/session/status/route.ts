/**
 * 학생 세션 상태 — 제출한 뒤 선생님이 돌려주거나 채점을 끝내면 학생 화면이 스스로 바뀌도록 짧게 묻는다
 * (학생 화면은 Realtime을 쓰지 않는다, verify P6). RLS로 자기 세션만 읽힌다.
 */
import { z } from "zod";
import { handler } from "@/lib/server/route";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ sessionId: z.string().uuid() });

export const POST = handler(schema, ["student"], async ({ sessionId }) => {
  try {
    const db = await createClient();
    const { data } = await db.from("sessions").select("status, submissions(returned_at)").eq("id", sessionId).maybeSingle();
    if (!data) throw new Error("not_found");
    const sub = data.submissions as unknown as { returned_at: string | null } | { returned_at: string | null }[] | null;
    const returnedAt = (Array.isArray(sub) ? sub[0]?.returned_at : sub?.returned_at) ?? null;
    return { status: data.status as string, returnedAt };
  } catch (e) {
    throw e instanceof Error && e.message === "not_found" ? e : new Error("upstream_unavailable");
  }
});
