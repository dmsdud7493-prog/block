/** 세션 조회 (사용자 권한 = RLS) */
import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SessionInfo {
  id: string;
  seed: string;
  slug: string;
  status: string;
  studentId: string;
}

export async function sessionForUser(sessionId: string): Promise<SessionInfo> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("sessions").select("id, seed, status, student_id, experiments(slug)").eq("id", sessionId).single();
    if (error || !data) throw new Error("not_found");
    const exp = data.experiments as unknown as { slug: string } | null;
    return { id: data.id, seed: data.seed, slug: exp?.slug ?? "", status: data.status, studentId: data.student_id };
  } catch {
    throw new Error("not_found");
  }
}

export async function runForUser(sessionId: string, runNo: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("runs").select("program, run_no").eq("session_id", sessionId).eq("run_no", runNo).single();
  if (error || !data) throw new Error("not_found");
  return data as { program: unknown; run_no: number };
}

export async function latestRunProgram(sessionId: string): Promise<unknown | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("runs").select("program").eq("session_id", sessionId).order("run_no", { ascending: false }).limit(1);
    return data?.[0]?.program ?? null;
  } catch {
    return null;
  }
}
