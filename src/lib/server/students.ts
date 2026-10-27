/**
 * 학생 계정 (R2·R9): 교사 명부로 서버가 만든다. 실명·이메일을 받지 않고, 내부 로그인 ID는 무작위,
 * 비밀번호는 반 코드+PIN+서버 비밀값의 해시라 PIN만 알아서는 다른 경로로 로그인할 수 없다.
 */
import "server-only";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { rpc } from "./rpc";

const domain = () => process.env.STUDENT_EMAIL_DOMAIN || "students.matter-lab.invalid";

export function studentPassword(joinCode: string, pin: string): string {
  const pepper = process.env.STUDENT_PIN_PEPPER ?? "";
  return createHash("sha256").update(`${pepper}:${joinCode.toUpperCase()}:${pin}`).digest("hex");
}

export const newPin = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");

export interface CreatedStudent {
  studentNo: string;
  pin: string | null;
  error?: string;
}

async function createOne(teacherId: string, classId: string, joinCode: string, studentNo: string): Promise<CreatedStudent> {
  const pin = newPin();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: `s-${randomUUID()}@${domain()}`,
      password: studentPassword(joinCode, pin),
      email_confirm: true,
      app_metadata: { role: "student" },
      user_metadata: { display_name: studentNo },
    });
    if (error || !data.user) return { studentNo, pin: null, error: "계정을 만들지 못했어요" };
    await rpc("app_enroll_student", { p_teacher: teacherId, p_class: classId, p_student: data.user.id, p_student_no: studentNo });
    return { studentNo, pin };
  } catch {
    return { studentNo, pin: null, error: "이미 있는 번호이거나 저장하지 못했어요" };
  }
}

export async function createStudents(teacherId: string, classId: string, joinCode: string, studentNos: string[]): Promise<CreatedStudent[]> {
  const unique = [...new Set(studentNos.map((s) => s.trim()).filter(Boolean))].slice(0, 60);
  return unique.reduce<Promise<CreatedStudent[]>>(async (accP, no) => [...(await accP), await createOne(teacherId, classId, joinCode, no)], Promise.resolve([]));
}

/** 교사 소유 반인지 확인한 뒤 학생 일괄 생성 */
export async function createStudentsForTeacher(teacherId: string, classId: string, studentNos: string[]): Promise<CreatedStudent[]> {
  try {
    const { data: cls } = await createAdminClient().from("classes").select("join_code, teacher_id").eq("id", classId).single();
    if (!cls || cls.teacher_id !== teacherId) throw new Error("forbidden");
    return await createStudents(teacherId, classId, cls.join_code, studentNos);
  } catch (e) {
    throw e instanceof Error && e.message === "forbidden" ? e : new Error("server_error");
  }
}

/** 교사 소유 확인 후 PIN 재발급 */
export async function resetPin(teacherId: string, studentId: string): Promise<string> {
  try {
    return await resetPinInner(teacherId, studentId);
  } catch (e) {
    throw e instanceof Error && e.message === "forbidden" ? e : new Error("server_error");
  }
}

async function resetPinInner(teacherId: string, studentId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("enrollments").select("classes!inner(join_code, teacher_id)").eq("student_id", studentId);
  const cls = (data ?? []).map((r) => r.classes as unknown as { join_code: string; teacher_id: string }).find((c) => c.teacher_id === teacherId);
  if (!cls) throw new Error("forbidden");
  const pin = newPin();
  const { error } = await admin.auth.admin.updateUserById(studentId, { password: studentPassword(cls.join_code, pin) });
  if (error) throw new Error("server_error");
  return pin;
}

/** 로그인용: 반 코드 + 번호 → 내부 로그인 ID */
export async function studentLoginEmail(joinCode: string, studentNo: string): Promise<string | null> {
  try {
    return await lookupLoginEmail(joinCode, studentNo);
  } catch {
    return null;
  }
}

async function lookupLoginEmail(joinCode: string, studentNo: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("enrollments").select("student_id, classes!inner(join_code)").eq("classes.join_code", joinCode.toUpperCase()).eq("student_no", studentNo.trim()).limit(1);
  const id = data?.[0]?.student_id as string | undefined;
  if (!id) return null;
  const { data: u } = await admin.auth.admin.getUserById(id);
  return u.user?.email ?? null;
}
