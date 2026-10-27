/** 과제 세션 시작 (보호자 동의 확인 R1 — DB에서 consent_required) */
import { handler } from "@/lib/server/route";
import { startSchema } from "@/lib/server/schemas";
import { rpcRow } from "@/lib/server/rpc";

export const POST = handler(startSchema, ["student"], ({ assignmentId }, user) =>
  rpcRow<{ id: string }>("app_start_session", { p_student: user.id, p_assignment: assignmentId }).then((s) => ({ sessionId: s.id })));
