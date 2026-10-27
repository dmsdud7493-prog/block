/**
 * 보고서 저장·제출 게이트 (plan S6 수용 기준, 지침 6.3·6.4)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyAll } from "../../scripts/db-apply.mjs";
import { asService, asUser, createUser, errorOf, pool, URL } from "./helpers";

let T: string, S: string, L: string, sess: string, lateSess: string;

const READY = {
  interpretation: { hypothesisVerdict: "supported", evidence: "표의 밀도 값", errorSources: "눈금 읽기 오차", improvements: "여러 번 측정" },
  reflection: { diff: "예상보다 밀도가 컸다 왜냐하면", hardest: "변인 통제가 어려웠다 그래서", curious: "다른 금속도 재 보고 싶다", realLife: "" },
};
const NOT_READY = { ...READY, reflection: { ...READY.reflection, curious: "짧음" } };

const save = (student: string, session: string, content: object) =>
  asService((q) => q("select public.app_save_report($1, $2, $3, $4) as v", [student, session, content, ["title"]]));
const submit = (student: string, session: string) =>
  asService((q) => q("select * from public.app_submit_report($1, $2)", [student, session]));

beforeAll(async () => {
  await applyAll(URL);
  T = await createUser("teacher", "보고서교사");
  [S, L] = [await createUser("student", "30101"), await createUser("student", "30102")];
  const cls = (await asService((q) => q("select * from public.app_create_class($1, '3학년 1반')", [T]))).rows[0];
  await asService(async (q) => {
    await q("select public.app_enroll_student($1, $2, $3, '1')", [T, cls.id, S]);
    await q("select public.app_enroll_student($1, $2, $3, '2')", [T, cls.id, L]);
    await q("select public.app_set_consent($1, $2, true, null)", [T, S]);
    await q("select public.app_set_consent($1, $2, true, null)", [T, L]);
  });
  const asg = (await asService((q) => q("select public.app_assign($1, $2, 'density', null, true, '{}') as id", [T, cls.id]))).rows[0].id;
  const past = (await asService((q) => q("select public.app_assign($1, $2, 'melting', now() - interval '1 day', false, '{}') as id", [T, cls.id]))).rows[0].id;
  sess = (await asService((q) => q("select id from public.app_start_session($1, $2)", [S, asg]))).rows[0].id;
  lateSess = (await asService((q) => q("select id from public.app_start_session($1, $2)", [L, past]))).rows[0].id;
});

afterAll(() => pool.end());

describe("보고서 저장 (app_save_report)", () => {
  it("저장할 때마다 version이 오른다", async () => {
    const a = (await save(S, sess, NOT_READY)).rows[0].v;
    const b = (await save(S, sess, NOT_READY)).rows[0].v;
    expect(b).toBe(a + 1);
  });
  it("다른 학생은 이 세션 보고서를 저장할 수 없다", async () => {
    expect(await errorOf(save(L, sess, READY))).toMatch(/forbidden|not_found/);
  });
  it("학생은 RLS로 자기 보고서만 읽는다", async () => {
    const mine = await asUser(S, (q) => q("select count(*)::int as n from public.reports where session_id = $1", [sess]));
    const other = await asUser(L, (q) => q("select count(*)::int as n from public.reports where session_id = $1", [sess]));
    expect([mine.rows[0].n, other.rows[0].n]).toEqual([1, 0]);
  });
});

describe("제출 게이트 (app_submit_report)", () => {
  it("성찰 3개 미만이면 reflection_required", async () => {
    expect(await errorOf(submit(S, sess))).toContain("reflection_required");
  });
  it("조건을 채우면 제출되고 세션이 잠긴다", async () => {
    await save(S, sess, READY);
    const r = (await submit(S, sess)).rows[0];
    expect([r.late, r.version]).toEqual([false, 1]);
    expect(await errorOf(save(S, sess, READY))).toContain("session_locked");
  });
  it("반환된 보고서를 다시 내면 resubmitted, 제출 버전 2", async () => {
    await pool.query("update public.sessions set status = 'returned' where id = $1", [sess]);
    await save(S, sess, READY);
    expect((await submit(S, sess)).rows[0].version).toBe(2);
    const st = (await pool.query("select status from public.sessions where id = $1", [sess])).rows[0].status;
    expect(st).toBe("resubmitted");
  });
  it("마감이 지났고 지각 제출을 허용하지 않으면 late_not_allowed", async () => {
    await save(L, lateSess, READY);
    expect(await errorOf(submit(L, lateSess))).toContain("late_not_allowed");
  });
  it("제출 이벤트가 남는다", async () => {
    const n = (await pool.query("select count(*)::int as n from public.events where session_id = $1 and event_type like 'report_%'", [sess])).rows[0].n;
    expect(n).toBe(2);
  });
});
