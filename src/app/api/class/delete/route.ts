/** 반 삭제 (R10, 학년 말) — 반·과제·세션 기록과 이 반에만 있던 학생 계정 */
import { handler } from "@/lib/server/route";
import { classIdSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const POST = handler(classIdSchema, ["teacher", "admin"], ({ classId }, user) =>
  rpc<number>("app_delete_class", { p_teacher: user.id, p_class: classId }).then((n) => ({ deleted: n })));
