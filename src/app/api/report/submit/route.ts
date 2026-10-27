/**
 * 보고서 제출 (요구사항 12·14, 지침 6.4) — 마지막 내용을 저장한 뒤 DB가 성찰·결론 조건을 다시 검사한다.
 * 조건 미충족 422 reflection_required, 마감 후 불허 403 late_not_allowed, 이미 제출 409 session_locked
 */
import { handler } from "@/lib/server/route";
import { reportDraftSchema } from "@/lib/server/schemas";
import { submitReport } from "@/lib/server/reportService";

export const POST = handler(reportDraftSchema, ["student"], (input, user) => submitReport(user.id, input));
