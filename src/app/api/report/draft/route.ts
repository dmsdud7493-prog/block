/** 보고서 자동저장 (요구사항 11) — 제출 후에는 session_locked */
import { handler } from "@/lib/server/route";
import { reportDraftSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const PUT = handler(reportDraftSchema, ["student"], ({ sessionId, content, aiAssisted }, user) =>
  rpc<number>("app_save_report", { p_student: user.id, p_session: sessionId, p_content: content, p_ai: aiAssisted }).then((version) => ({ version })));
