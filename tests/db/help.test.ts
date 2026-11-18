/**
 * 0014: 교사 "도와줄까?"(help_offers), 다시 낸 보고서의 처음 제출 보존(previous_snapshot), 코멘트만으로 돌려주기
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyAll } from "../../scripts/db-apply.mjs";
import { asService, asUser, createUser, errorOf, pool, URL } from "./helpers";

let T: string, T2: string, S: string, S2: string, sess: string, sub: string;
const READY = {
  interpretation: { hypothesisVerdict: "supported", evidence: "표의 밀도 값", trend: "같은 물질이면 크기가 달라도 밀도가 같다", errorSources: "눈금 읽기 오차", improvements: "여러 번 측정" },
  reflection: { diff: "", hardest: "변인 통제가 어려웠다 그래서", curious: "다른 금속도 재 보고 싶다", realLife: "국 위에 뜨는 기름에서 본다" },
};
const svc = (sql: string, params: unknown[]) => asService((q) => q(sql, params));

beforeAll(async () => {
  await applyAll(URL);
  [T, T2] = [await createUser("teacher", "도움교사"), await createUser("teacher", "옆반")];
  [S, S2] = [await createUser("student", "20101"), await createUser("student", "20102")];
  const cls = (await svc("select * from public.app_create_class($1, '2학년 1반')", [T])).rows[0];
  await svc("select public.app_enroll_student($1, $2, $3, '1')", [T, cls.id, S]);
  await svc("select public.app_enroll_student($1, $2, $3, '2')", [T, cls.id, S2]);
  await svc("select public.app_set_consent($1, $2, true, null)", [T, S]);
  const asg = (await svc("select public.app_assign($1, $2, 'density', null, true, '{}') as id", [T, cls.id])).rows[0].id;
  sess = (await svc("select id from public.app_start_session($1, $2)", [S, asg])).rows[0].id;
});

afterAll(() => pool.end());

describe("도와줄까?", () => {
  it("자기 반 교사만 물을 수 있고, 답 기다리는 물음은 하나만 둔다", async () => {
    expect(await errorOf(svc("select public.app_offer_help($1, $2)", [T2, sess]))).toContain("forbidden");
    const a = (await svc("select public.app_offer_help($1, $2) as id", [T, sess])).rows[0].id;
    const b = (await svc("select public.app_offer_help($1, $2) as id", [T, sess])).rows[0].id;
    expect(b).toBe(a);
    expect((await pool.query("select count(*)::int n from public.events where session_id = $1 and event_type = 'help_offered'", [sess])).rows[0].n).toBe(1);
  });
  it("학생 자신만 읽고 답하며, 답은 한 번만 남는다", async () => {
    const id = (await pool.query("select id from public.help_offers where session_id = $1", [sess])).rows[0].id;
    expect((await asUser(S, (q) => q("select id from public.help_offers"))).rowCount).toBe(1);
    expect((await asUser(S2, (q) => q("select id from public.help_offers"))).rowCount).toBe(0);
    expect((await asUser(T2, (q) => q("select id from public.help_offers"))).rowCount).toBe(0);
    expect(await errorOf(svc("select public.app_answer_help($1, $2, 'yes')", [S2, id]))).toContain("forbidden");
    await svc("select public.app_answer_help($1, $2, 'yes')", [S, id]);
    await svc("select public.app_answer_help($1, $2, 'no')", [S, id]);
    expect((await pool.query("select answer from public.help_offers where id = $1", [id])).rows[0].answer).toBe("yes");
    expect((await pool.query("select payload->>'answer' a from public.events where session_id = $1 and event_type = 'help_answered'", [sess])).rows.map((r) => r.a)).toEqual(["yes"]);
  });
});

describe("코멘트만으로 돌려주기 → 다시 내면 처음 보고서가 남는다", () => {
  it("루브릭 없이 코멘트만 있으면 돌려줄 수 있고, 끝내기는 여전히 4항목", async () => {
    await svc("select public.app_save_report($1, $2, $3, '{}')", [S, sess, READY]);
    sub = (await svc("select * from public.app_submit_report($1, $2)", [S, sess])).rows[0].submission_id;
    expect(await errorOf(svc("select public.app_return_submission($1, $2, '{}', '', null, true)", [T, sub]))).toContain("invalid_rubric");
    expect(await errorOf(svc("select public.app_return_submission($1, $2, '{}', '좋아요', null, false)", [T, sub]))).toContain("invalid_rubric");
    await svc("select public.app_return_submission($1, $2, '{}', '과정에 미션 2·3도 적어 봐', null, true)", [T, sub]);
    expect((await pool.query("select status from public.sessions where id = $1", [sess])).rows[0].status).toBe("returned");
  });
  it("다시 내면 처음 낸 보고서가 previous_snapshot에 남는다", async () => {
    await svc("select public.app_save_report($1, $2, $3, '{}')", [S, sess, { ...READY, title: "고친 제목" }]);
    await svc("select * from public.app_submit_report($1, $2)", [S, sess]);
    const r = (await pool.query("select version, previous_snapshot, report_snapshot from public.submissions where id = $1", [sub])).rows[0];
    expect(r.version).toBe(2);
    expect(r.previous_snapshot.content.title ?? "").not.toBe("고친 제목");
    expect(r.report_snapshot.content.title).toBe("고친 제목");
  });
});
