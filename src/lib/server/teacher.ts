/** 교사 화면 데이터 (RLS: 자기 반만) */
import "server-only";
import { createClient } from "@/lib/supabase/server";

import type { AssignmentRow, ClassSummary, StudentRow } from "@/lib/teacherTypes";
export type { AssignmentRow, ClassSummary, StudentRow };

export async function teacherClasses(): Promise<ClassSummary[]> {
  try {
    const db = await createClient();
    const { data } = await db.from("classes").select("id, name, join_code, settings, enrollments(count)").order("created_at");
    return (data ?? []).map((c) => ({ id: c.id, name: c.name, joinCode: c.join_code, settings: c.settings as Record<string, unknown>, studentCount: (c.enrollments as unknown as { count: number }[])[0]?.count ?? 0 }));
  } catch {
    return [];
  }
}

export async function classDetail(classId: string) {
  try {
    const db = await createClient();
    const [cls, enr, asg] = await Promise.all([
      db.from("classes").select("id, name, join_code, settings").eq("id", classId).single(),
      db.from("enrollments").select("student_no, profiles(id, consent_on_file, consent_date)").eq("class_id", classId).order("student_no"),
      db.from("assignments").select("id, due_at, allow_late, experiments(slug, title)").eq("class_id", classId).order("created_at"),
    ]);
    if (!cls.data) return null;
    const students: StudentRow[] = (enr.data ?? []).map((e) => {
      const p = e.profiles as unknown as { id: string; consent_on_file: boolean; consent_date: string | null };
      return { id: p.id, studentNo: e.student_no, consentOnFile: p.consent_on_file, consentDate: p.consent_date };
    });
    const assignments: AssignmentRow[] = (asg.data ?? []).map((a) => {
      const x = a.experiments as unknown as { slug: string; title: string };
      return { id: a.id, slug: x.slug, title: x.title, dueAt: a.due_at, allowLate: a.allow_late };
    });
    return { id: cls.data.id, name: cls.data.name, joinCode: cls.data.join_code, settings: cls.data.settings as Record<string, unknown>, students, assignments };
  } catch {
    return null;
  }
}
