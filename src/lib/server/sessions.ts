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

/** 배정 설정(교사가 실험을 배정할 때 고른 것) — fixedAmounts: 넣는 양 정해 주기(ADR-P26). 읽지 못하면 기본(자유) */
export async function assignmentOptions(sessionId: string): Promise<{ fixedAmounts: boolean }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("sessions").select("assignments(settings_override)").eq("id", sessionId).single();
    const raw = (data?.assignments as unknown as { settings_override?: Record<string, unknown> } | null)?.settings_override ?? {};
    return { fixedAmounts: raw.fixed_amounts === true };
  } catch {
    return { fixedAmounts: false };
  }
}
