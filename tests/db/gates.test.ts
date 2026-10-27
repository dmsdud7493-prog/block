/**
 * Supabase 스키마·RLS·서버 함수 게이트 (plan S3 수용 기준, ADR-P03·P07)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyAll } from "../../scripts/db-apply.mjs";
import { asService, asUser, createUser, errorOf, pool, URL } from "./helpers";

let T1: string, T2: string, A: string, B: string, X: string;
let C1: { id: string; join_code: string }, C2: { id: string };
let asg1: string, sessA: string, sessB: string;

beforeAll(async () => {
  await applyAll(URL);
  [T1, T2] = [await createUser("teacher", "교사1"), await createUser("teacher", "교사2")];
  [A, B, X] = [await createUser("student", "20301"), await createUser("student", "20302"), await createUser("student", "20901")];
  C1 = (await asService((q) => q("select * from public.app_create_class($1, '2학년 3반')", [T1]))).rows[0];
  C2 = (await asService((q) => q("select * from public.app_create_class($1, '2학년 9반')", [T2]))).rows[0];
  await asService(async (q) => {
    await q("select public.app_enroll_student($1, $2, $3, '1')", [T1, C1.id, A]);
    await q("select public.app_enroll_student($1, $2, $3, '2')", [T1, C1.id, B]);
    await q("select public.app_enroll_student($1, $2, $3, '1')", [T2, C2.id, X]);
    await q("select public.app_set_consent($1, $2, true, null)", [T1, B]);
  });
  asg1 = (await asService((q) => q("select public.app_assign($1, $2, 'density', null, true, '{}') as id", [T1, C1.id]))).rows[0].id;
  sessB = (await asService((q) => q("select id from public.app_start_session($1, $2)", [B, asg1]))).rows[0].id;
});

afterAll(() => pool.end());

describe("학급·계정 (R1, R2)", () => {
  it("반 코드는 6자리 대문자/숫자", () => expect(C1.join_code).toMatch(/^[A-Z0-9]{6}$/));
  it("학생 profiles에 이메일·실명 열이 없다", async () => {
    const cols = (await pool.query("select column_name from information_schema.columns where table_name = 'profiles'")).rows.map((r) => r.column_name);
    expect(cols).not.toContain("email");
    expect(cols.some((c: string) => /real_name|full_name|phone/.test(c))).toBe(false);
  });
  it("app_join_class: 틀린 코드 → invalid_join_code, 맞는 코드 → 등록", async () => {
    const S = await createUser("student", "20303");
    expect(await errorOf(asService((q) => q("select public.app_join_class($1, 'WRONG1', '3')", [S])))).toContain("invalid_join_code");
    await asService((q) => q("select public.app_join_class($1, $2, '3')", [S, C1.join_code.toLowerCase()]));
    const n = (await pool.query("select count(*)::int as n from public.enrollments where student_id = $1", [S])).rows[0].n;
    expect(n).toBe(1);
  });
  it("교사가 아닌 사용자는 반을 만들 수 없다", async () => {
    expect(await errorOf(asService((q) => q("select public.app_create_class($1, 'x')", [A])))).toContain("forbidden");
  });
  it("보호자 동의 없는 학생은 세션을 시작할 수 없다 (consent_required)", async () => {
    expect(await errorOf(asService((q) => q("select public.app_start_session($1, $2)", [A, asg1])))).toContain("consent_required");
    await asService((q) => q("select public.app_set_consent($1, $2, true, null)", [T1, A]));
    sessA = (await asService((q) => q("select id from public.app_start_session($1, $2)", [A, asg1]))).rows[0].id;
    expect(sessA).toBeTruthy();
  });
  it("다른 반 학생은 이 과제로 세션을 만들 수 없다", async () => {
    await asService((q) => q("select public.app_set_consent($1, $2, true, null)", [T2, X]));
    expect(await errorOf(asService((q) => q("select public.app_start_session($1, $2)", [X, asg1])))).toContain("forbidden");
  });
});

describe("예측 게이트 (지침 3.1) · 실행 누적 (지침 3.4)", () => {
  const record = (runNo: number) => asService((q) => q(
    "select public.app_record_run($1, $2, $3, 1, '{}'::jsonb, 'seed', true, '[]', '[]', '[]', '[]', '{}') as id", [A, sessA, runNo]));
  it("예측 없이 begin_run/record_run → prediction_required", async () => {
    expect(await errorOf(asService((q) => q("select * from public.app_begin_run($1, $2)", [A, sessA])))).toContain("prediction_required");
    expect(await errorOf(record(1))).toContain("prediction_required");
  });
  it("예측 이유가 5자 미만이면 거부", async () => {
    expect(await errorOf(asService((q) => q("select public.app_upsert_prediction($1, $2, 'same_density', 'same', '몰라', 0, null)", [A, sessA])))).toContain("invalid_input");
  });
  it("예측 후 실행 → run_no가 1, 2로 누적되고 블록 버전도 누적", async () => {
    await asService((q) => q("select public.app_upsert_prediction($1, $2, 'same_density', 'same', '같은 물질이니까', 1, null)", [A, sessA]));
    const begin = (await asService((q) => q("select * from public.app_begin_run($1, $2)", [A, sessA]))).rows[0];
    expect(begin.next_run_no).toBe(1);
    expect(begin.slug).toBe("density");
    await record(1);
    await record(2);
    const v1 = (await asService((q) => q("select public.app_save_program($1, $2, '{}', '{}', null) as v", [A, sessA]))).rows[0].v;
    const v2 = (await asService((q) => q("select public.app_save_program($1, $2, '{}', '{}', null) as v", [A, sessA]))).rows[0].v;
    expect([v1, v2]).toEqual([1, 2]);
    const runs = (await pool.query("select run_no from public.runs where session_id = $1 order by run_no", [sessA])).rows.map((r) => r.run_no);
    expect(runs).toEqual([1, 2]);
  });
  it("계산값 재시도는 attempt가 누적된다 (FORMATIVE)", async () => {
    const a1 = (await asService((q) => q("select public.app_record_check($1, $2, 1, 'density.water.t1', 1.2, 'g/mL', false, 'swapped') as a", [A, sessA]))).rows[0].a;
    const a2 = (await asService((q) => q("select public.app_record_check($1, $2, 1, 'density.water.t1', 1.0, 'g/mL', true, null) as a", [A, sessA]))).rows[0].a;
    expect([a1, a2]).toEqual([1, 2]);
  });
  it("남의 세션에는 쓸 수 없다", async () => {
    expect(await errorOf(asService((q) => q("select public.app_save_program($1, $2, '{}', '{}', null)", [B, sessA])))).toContain("forbidden");
  });
});

describe("RLS — 읽기 격리", () => {
  const count = (uid: string, sql: string, params: unknown[] = []) => asUser(uid, async (q) => (await q(sql, params)).rowCount);
  it("학생 A는 학생 B의 세션·실행·보고서·대화를 볼 수 없다", async () => {
    expect(await count(A, "select * from public.sessions where id = $1", [sessB])).toBe(0);
    expect(await count(A, "select * from public.reports where session_id = $1", [sessB])).toBe(0);
    expect(await count(A, "select * from public.chat_messages where session_id = $1", [sessB])).toBe(0);
    expect(await count(A, "select * from public.sessions where id = $1", [sessA])).toBe(1);
    expect(await count(A, "select * from public.runs where session_id = $1", [sessA])).toBe(2);
  });
  it("교사는 자기 반만 본다", async () => {
    expect(await count(T1, "select * from public.sessions")).toBe(2);
    expect(await count(T2, "select * from public.sessions where class_id = $1", [C1.id])).toBe(0);
    expect(await count(T2, "select * from public.profiles where id = $1", [A])).toBe(0);
    expect(await count(T1, "select * from public.profiles where id = $1", [A])).toBe(1);
  });
  it("로그인 사용자는 테이블에 직접 쓸 수 없다 (서버 함수만)", async () => {
    expect(await errorOf(asUser(A, (q) => q("insert into public.measurements (session_id, run_id, key, is_correct, attempt) select $1, id, 'k', true, 1 from public.runs where session_id = $1 limit 1", [sessA])))).toMatch(/permission denied/);
    expect(await errorOf(asUser(A, (q) => q("update public.sessions set status = 'returned' where id = $1", [sessA])))).toMatch(/permission denied/);
  });
  it("로그인 사용자는 app_* 서버 함수를 직접 부를 수 없다", async () => {
    expect(await errorOf(asUser(A, (q) => q("select public.app_record_check($1, $2, 1, 'k', 1, 'g', true, null)", [A, sessA])))).toMatch(/permission denied/);
  });
  it("experiments.spec(서버 전용 열)은 읽을 수 없고 목록은 읽을 수 있다", async () => {
    expect(await count(A, "select id, slug, title from public.experiments")).toBe(6);
    expect(await errorOf(asUser(A, (q) => q("select spec from public.experiments")))).toMatch(/permission denied/);
  });
  it("학생은 이벤트 로그를 읽지 않는다(교사 전용)", async () => {
    await asService((q) => q(`select public.app_log_events($1, $2, '[{"type":"block_edit","payload":{}}]')`, [A, sessA]));
    expect(await count(A, "select * from public.events")).toBe(0);
    expect(await count(T1, "select * from public.events")).toBe(1);
  });
});

describe("제출 잠금", () => {
  it("제출된 세션은 편집할 수 없다 (session_locked)", async () => {
    await pool.query("update public.sessions set status = 'submitted' where id = $1", [sessB]);
    expect(await errorOf(asService((q) => q("select public.app_save_program($1, $2, '{}', '{}', null)", [B, sessB])))).toContain("session_locked");
  });
});
