/** 현재 사용자 (Data Access Layer) — getClaims()로 JWT 검증 후 profiles에서 역할을 읽는다 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface CurrentUser {
  id: string;
  role: "student" | "teacher" | "admin";
  displayName: string;
  consentOnFile: boolean;
}

export async function currentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const id = data?.claims?.sub;
    if (!id) return null;
    const { data: p } = await supabase.from("profiles").select("role, display_name, consent_on_file").eq("id", id).single();
    if (!p) return null;
    return { id, role: p.role, displayName: p.display_name, consentOnFile: p.consent_on_file };
  } catch {
    return null;
  }
}
