"use server";
/** 로그인·가입 서버 액션 — 오류 문구는 어느 칸이 틀렸는지 드러내지 않는다 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { studentLoginEmail, studentPassword } from "@/lib/server/students";

export interface AuthState {
  error: string | null;
}

const NOT_READY: AuthState = { error: "아직 학교 서버가 연결되지 않았어요. 체험 모드를 이용해 주세요." };

export async function loginStudent(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_READY;
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const no = String(form.get("no") ?? "").trim();
  const pin = String(form.get("pin") ?? "").trim();
  if (form.get("ack") !== "on") return { error: "안내 내용을 읽고 확인란에 표시해 주세요." };
  try {
    const email = await studentLoginEmail(code, no);
    const supabase = await createClient();
    const { error } = email ? await supabase.auth.signInWithPassword({ email, password: studentPassword(code, pin) }) : { error: true };
    if (error) return { error: "반 코드·번호·PIN을 다시 확인해 주세요." };
  } catch {
    return { error: "잠시 후 다시 시도해 주세요." };
  }
  redirect("/lab");
}

export async function loginTeacher(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_READY;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
    if (error) return { error: "이메일 또는 비밀번호를 다시 확인해 주세요." };
  } catch {
    return { error: "잠시 후 다시 시도해 주세요." };
  }
  redirect("/dashboard");
}

function domainAllowed(email: string): boolean {
  const list = (process.env.TEACHER_EMAIL_DOMAIN_ALLOWLIST ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return list.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export async function signupTeacher(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_READY;
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  if (!domainAllowed(email)) return { error: "학교(교육청) 이메일로만 교사 가입을 할 수 있어요. 관리자에게 도메인 등록을 요청하세요." };
  if (password.length < 10) return { error: "비밀번호는 10자 이상으로 정해 주세요." };
  try {
    const { error } = await createAdminClient().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "teacher" }, user_metadata: { display_name: name || "선생님" } });
    if (error) return { error: "가입하지 못했어요. 이미 가입한 이메일인지 확인해 주세요." };
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({ email, password });
  } catch {
    return { error: "잠시 후 다시 시도해 주세요." };
  }
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // 이미 로그아웃된 상태
  }
  redirect("/login");
}
