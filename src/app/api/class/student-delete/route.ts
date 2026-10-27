/** 학생 계정·기록 영구 삭제 (R10) — 담당 교사만, 다른 교사 반에도 있는 학생은 거부(DB 게이트) */
import { handler } from "@/lib/server/route";
import { pinSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const POST = handler(pinSchema, ["teacher", "admin"], ({ studentId }, user) =>
  rpc<number>("app_delete_student", { p_teacher: user.id, p_student: studentId }).then((n) => ({ sessions: n })));
