/** 보고서 제출 서비스 (server-only) */
import "server-only";
import { rpc, rpcRow, normalizeError } from "./rpc";
import type { ReportContent } from "@/lib/report/template";

export async function submitReport(userId: string, input: { sessionId: string; content: ReportContent; aiAssisted: string[] }) {
  try {
    await rpc<number>("app_save_report", { p_student: userId, p_session: input.sessionId, p_content: input.content, p_ai: input.aiAssisted });
    const r = await rpcRow<{ submission_id: string; late: boolean; version: number }>("app_submit_report", { p_student: userId, p_session: input.sessionId });
    return { submissionId: r.submission_id, late: r.late, version: r.version };
  } catch (e) {
    throw normalizeError(e);
  }
}
