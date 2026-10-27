/**
 * 교사 채점·반환·재제출, 이벤트 위조 방지, 타 반 격리 (plan S7 수용 기준, 규칙 3 감사 로그)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyAll } from "../../scripts/db-apply.mjs";
import { asService, asUser, createUser, errorOf, pool, URL } from "./helpers";

let T: string, T2: string, S: string, asg: string, sess: string, sub: string;
const FULL = { hypothesis_variables: "high", data: "mid", interpretation: "mid", reflection: "high" };
const READY = {
  interpretation: { hypothesisVerdict: "supported", evidence: "표의 밀도 값", errorSources: "눈금 읽기 오차", improvements: "여러 번 측정" },
  reflection: { diff: "예상보다 밀도가 컸다 왜냐하면", hardest: "변인 통제가 어려웠다 그래서", curious: "다른 금속도 재 보고 싶다", realLife: "" },
};
const count = async (uid: string, sql: string, params: unknown[] = []) => (await asUser(uid, (q) => q(sql, params))).rowCount;
const svc = (sql: string, params: unknown[]) => asService((q) => q(sql, params));

beforeAll(async () => {
  await applyAll(URL);
  [T, T2] = [await createUser("teacher", "채점교사"), await createUser("teacher", "옆반교사")];
  S = await createUser("student", "10101");
  const cls = (await svc("select * from public.app_create_class($1, '1학년 1반')", [T])).rows[0];
  await svc("select public.app_enroll_student($1, $2, $3, '1')", [T, cls.id, S]);
  await svc("select public.app_set_consent($1, $2, true, null)", [T, S]);
  asg = (await svc("select public.app_assign($1, $2, 'density', null, true, '{}') as id", [T, cls.id])).rows[0].id;
  sess = (await svc("select id from public.app_start_session($1, $2)", [S, asg])).rows[0].id;
  await svc("select public.app_save_report($1, $2, $3, '{}')", [S, sess, READY]);
  sub = (await svc("select * from public.app_submit_report($1, $2)", [S, sess])).rows[0].submission_id;
});

afterAll(() => pool.end());

describe("채점 초안 (교사만 보임)", () => {
  it("잘못된 루브릭 값은 invalid_rubric", async () => {
    expect(await errorOf(svc("select public.app_save_grade_draft($1, $2, $3, '')", [T, sub, { data: "best" }]))).toContain("invalid_rubric");
  });
  it("다른 반 교사는 채점할 수 없다", async () => {
    expect(await errorOf(svc("select public.app_save_grade_draft($1, $2, $3, '')", [T2, sub, { data: "mid" }]))).toContain("forbidden");
  });
  it("초안은 교사만 읽고, 학생에게는 반환 전 점수가 보이지 않는다", async () => {
    await svc("select public.app_save_grade_draft($1, $2, $3, '초안 코멘트')", [T, sub, { data: "mid" }]);
    expect(await count(T, "select * from public.grade_drafts")).toBe(1);
    expect(await count(S, "select * from public.grade_drafts")).toBe(0);
    expect(await count(T2, "select * from public.grade_drafts")).toBe(0);
    const r = await asUser(S, (q) => q("select rubric_scores from public.submissions where id = $1", [sub]));
    expect(r.rows[0].rubric_scores).toBeNull();
  });
});

describe("반환 → 재편집 → 재제출 → 재채점 (지침 6.3, R11)", () => {
  it("루브릭 4항목이 모두 있어야 반환된다", async () => {
    expect(await errorOf(svc("select public.app_return_submission($1, $2, $3, '', null)", [T, sub, { data: "mid" }]))).toContain("invalid_rubric");
  });
  it("반환하면 세션이 returned, 감사 로그·이벤트가 남고 초안은 지워진다", async () => {
    await svc("select public.app_return_submission($1, $2, $3, '근거 값을 더 써 보자', null)", [T, sub, FULL]);
    const st = (await pool.query("select status from public.sessions where id = $1", [sess])).rows[0].status;
    expect(st).toBe("returned");
    const audit = (await pool.query("select reason from public.grade_audit_log where submission_id = $1", [sub])).rows;
    expect(audit.map((a) => a.reason)).toEqual(["first_return"]);
    expect((await pool.query("select count(*)::int n from public.events where session_id = $1 and event_type = 'report_returned'", [sess])).rows[0].n).toBe(1);
    expect((await pool.query("select count(*)::int n from public.grade_drafts")).rows[0].n).toBe(0);
    const r = await asUser(S, (q) => q("select rubric_scores, teacher_feedback from public.submissions where id = $1", [sub]));
    expect(r.rows[0].rubric_scores).toEqual(FULL);
  });
  it("반환 중에는 다시 반환할 수 없다(not_submitted)", async () => {
    expect(await errorOf(svc("select public.app_return_submission($1, $2, $3, '', null)", [T, sub, FULL]))).toContain("not_submitted");
  });
  it("학생이 고쳐서 다시 내면 resubmitted·version 2, 재채점은 regrade로 기록", async () => {
    await svc("select public.app_save_report($1, $2, $3, '{}')", [S, sess, READY]);
    expect((await svc("select * from public.app_submit_report($1, $2)", [S, sess])).rows[0].version).toBe(2);
    await svc("select public.app_return_submission($1, $2, $3, '잘 고쳤어요', null)", [T, sub, { ...FULL, interpretation: "high" }]);
    const audit = (await pool.query("select reason from public.grade_audit_log where submission_id = $1 order by id", [sub])).rows;
    expect(audit.map((a) => a.reason)).toEqual(["first_return", "regrade"]);
  });
});

describe("격리·무결성", () => {
  it("다른 반 교사는 이 반 세션·이벤트·제출물을 0행으로 본다", async () => {
    expect(await count(T2, "select * from public.sessions")).toBe(0);
    expect(await count(T2, "select * from public.events")).toBe(0);
    expect(await count(T2, "select * from public.submissions")).toBe(0);
    expect(await count(T, "select * from public.events")).toBeGreaterThan(0);
  });
  it("학생 브라우저는 제출·반환·플래그 이벤트를 위조할 수 없다", async () => {
    const n = (await svc(`select public.app_log_events($1, $2, '[{"type":"report_submitted","payload":{}},{"type":"ai_flagged","payload":{}},{"type":"graph_opened","payload":{}}]') as n`, [S, sess])).rows[0].n;
    expect(n).toBe(1);
  });
  it("마감 조정은 담당 교사만", async () => {
    expect(await errorOf(svc("select public.app_update_assignment($1, $2, now(), false)", [T2, asg]))).toContain("forbidden");
    await svc("select public.app_update_assignment($1, $2, now() + interval '1 day', false)", [T, asg]);
    expect((await pool.query("select allow_late from public.assignments where id = $1", [asg])).rows[0].allow_late).toBe(false);
  });
});

describe("재제출하면 이전 반환 표시가 지워진다 (0009)", () => {
  it("학생 화면에 지난 점수가 '현재'로 보이지 않는다", async () => {
    await pool.query("update public.sessions set status = 'returned' where id = $1", [sess]);
    await svc("select public.app_save_report($1, $2, $3, '{}')", [S, sess, READY]);
    await svc("select * from public.app_submit_report($1, $2)", [S, sess]);
    const r = (await pool.query("select returned_at, rubric_scores from public.submissions where id = $1", [sub])).rows[0];
    expect([r.returned_at, r.rubric_scores]).toEqual([null, null]);
    expect((await pool.query("select count(*)::int n from public.grade_audit_log where submission_id = $1", [sub])).rows[0].n).toBe(2);
  });
});
