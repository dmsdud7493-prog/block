/** 교사 화면 데이터 (RLS: 자기 반만) */
import "server-only";
import { createClient } from "@/lib/supabase/server";

import type { AssignmentRow, ClassSummary, StudentRow } from "@/lib/teacherTypes";
export type { AssignmentRow, ClassSummary, StudentRow };

/** 반 이름 순(2-1, 2-2, … 2-7, 2-10) — 만든 순서가 아니라 숫자를 읽어 차례대로 (2026-11-21) */
export const sortClasses = <T extends { name: string }>(rows: T[]): T[] => [...rows].sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));

export async function teacherClasses(): Promise<ClassSummary[]> {
  try {
    const db = await createClient();
    const { data } = await db.from("classes").select("id, name, join_code, settings, enrollments(count)").order("created_at");
    const rows = (data ?? []).map((c) => ({ id: c.id, name: c.name, joinCode: c.join_code, settings: c.settings as Record<string, unknown>, studentCount: (c.enrollments as unknown as { count: number }[])[0]?.count ?? 0 }));
    return sortClasses(rows);
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
      db.from("assignments").select("id, due_at, allow_late, settings_override, experiments(slug, title)").eq("class_id", classId).order("created_at"),
    ]);
    if (!cls.data) return null;
    const students: StudentRow[] = (enr.data ?? []).map((e) => {
      const p = e.profiles as unknown as { id: string; consent_on_file: boolean; consent_date: string | null };
      return { id: p.id, studentNo: e.student_no, consentOnFile: p.consent_on_file, consentDate: p.consent_date };
    });
    const assignments: AssignmentRow[] = (asg.data ?? []).map((a) => {
      const x = a.experiments as unknown as { slug: string; title: string };
      return { id: a.id, slug: x.slug, title: x.title, dueAt: a.due_at, allowLate: a.allow_late, fixedAmounts: (a.settings_override as Record<string, unknown> | null)?.fixed_amounts === true };
    });
    return { id: cls.data.id, name: cls.data.name, joinCode: cls.data.join_code, settings: cls.data.settings as Record<string, unknown>, students, assignments };
  } catch {
    return null;
  }
}
