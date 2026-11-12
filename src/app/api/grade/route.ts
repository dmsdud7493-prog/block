/**
 * T-05 채점 (지침 6.3, R11 교사 최종 판단): draft = 교사만 보는 초안 저장,
 * return = 확정하고 한 번 더 고치게 돌려주기(세션 returned), final = 확정하고 끝내기(채점만 공개, 고칠 수 없음).
 * 고쳐서 다시 내기는 한 번만 — 2번째 제출은 final만 된다(revision_limit, ADR-P25).
 * 루브릭 결과는 SUMMATIVE — 반환 전에는 학생에게 보이지 않는다.
 */
import { handler } from "@/lib/server/route";
import { gradeSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const POST = handler(gradeSchema, ["teacher", "admin"], ({ submissionId, action, rubric, feedback, reason }, user) =>
  action === "draft"
    ? rpc("app_save_grade_draft", { p_teacher: user.id, p_submission: submissionId, p_rubric: rubric, p_feedback: feedback }).then(() => ({ saved: true, returnedAt: null as string | null }))
    : rpc<string>("app_return_submission", { p_teacher: user.id, p_submission: submissionId, p_rubric: rubric, p_feedback: feedback, p_reason: reason ?? null, p_allow_revision: action === "return" }).then((at) => ({ saved: true, returnedAt: at as string | null })));
