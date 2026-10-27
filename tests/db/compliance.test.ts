/**
 * S9 컴플라이언스: 학생 삭제 cascade(R10), 반 삭제, 보존 기간 정리, 비용·지침 지표 뷰(RLS 적용), 동의 가드(R1)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyAll } from "../../scripts/db-apply.mjs";
import { asService, asUser, createUser, errorOf, pool, URL } from "./helpers";

let T: string, T2: string, S: string, K: string, N: string, cls: string, asg: string, sess: string;
const svc = (sql: string, params: unknown[]) => asService((q) => q(sql, params));
const CHILD_TABLES = ["block_programs", "runs", "measurements", "predictions", "reports", "submissions", "chat_messages", "events"];
const READY = {
  interpretation: { hypothesisVerdict: "supported", evidence: "표의 밀도 값", errorSources: "눈금 읽기 오차", improvements: "여러 번 측정" },
  reflection: { diff: "예상보다 밀도가 컸다 왜냐하면", hardest: "변인 통제가 어려웠다 그래서", curious: "다른 금속도 재 보고 싶다", realLife: "" },
};

async function fullSession(student: string): Promise<string> {
  const id = (await svc("select id from public.app_start_session($1, $2)", [student, asg])).rows[0].id;
  await svc("select public.app_save_program($1, $2, $3, null, '{}')", [student, id, { experiment: "density", steps: [], variables: [{ blockId: "v", role: "independent", optionId: "iron_size", rationale: "크기만" }] }]);
  await svc("select public.app_upsert_prediction($1, $2, 'same_density', 'same', '왜냐하면 같은 물질', 1, null)", [student, id]);
  await svc("select public.app_begin_run($1, $2)", [student, id]);
  await svc("select public.app_record_run($1, $2, 1, 1, '{}', 'seed', true, '[]', '[]', '[]', '[]', '{}')", [student, id]);
  await svc("select public.app_record_check($1, $2, 1, 'density.iron.t1', 7.9, 'g/mL', true, null)", [student, id]);
  await svc("select public.app_add_chat($1, $2, 'assistant', '좋아요', $3, false)", [student, id, { usage: { input: 1000, output: 200, cacheRead: 500, cacheWrite: 0 }, model: "claude-haiku-5-5", hint_level: 1 }]);
  await svc("select public.app_save_report($1, $2, $3, '{reflection}')", [student, id, READY]);
  await svc("select * from public.app_submit_report($1, $2)", [student, id]);
  return id;
}

beforeAll(async () => {
  await applyAll(URL);
  [T, T2] = [await createUser("teacher", "삭제교사"), await createUser("teacher", "다른교사")];
  [S, K, N] = [await createUser("student", "20101"), await createUser("student", "20102"), await createUser("student", "20103")];
  cls = (await svc("select * from public.app_create_class($1, '2학년 1반')", [T])).rows[0].id;
  for (const [u, no] of [[S, "1"], [K, "2"], [N, "3"]]) await svc("select public.app_enroll_student($1, $2, $3, $4)", [T, cls, u, no]);
  for (const u of [S, K]) await svc("select public.app_set_consent($1, $2, true, null)", [T, u]);
  asg = (await svc("select public.app_assign($1, $2, 'density', null, true, '{}') as id", [T, cls])).rows[0].id;
  sess = await fullSession(S);
  await fullSession(K);
});

afterAll(() => pool.end());

describe("동의 가드 (R1)", () => {
  it("보호자 동의가 없는 학생은 세션을 만들 수 없다", async () => {
    expect(await errorOf(svc("select public.app_start_session($1, $2)", [N, asg]))).toContain("consent_required");
  });
});

describe("지표·비용 뷰 (RLS 적용)", () => {
  it("v_guideline_metrics: 담당 교사에게 반·실험별 지표가 보이고 다른 교사·학생에게는 0행", async () => {
    const mine = await asUser(T, (q) => q("select * from public.v_guideline_metrics"));
    expect(mine.rows).toHaveLength(1);
    const m = mine.rows[0];
    expect(Number(m.sessions)).toBe(2);
    expect(Number(m.g42_hints_per_prediction)).toBe(1);
    expect(Number(m.g24_rationale_rate)).toBe(1);
    expect(Number(m.g64_reflection_complete_rate)).toBe(1);
    expect(Number(m.r11_ai_marked_rate)).toBe(1);
    expect((await asUser(T2, (q) => q("select * from public.v_guideline_metrics"))).rows).toHaveLength(0);
    expect((await asUser(S, (q) => q("select * from public.v_guideline_metrics"))).rows.every((r) => Number(r.sessions) <= 1)).toBe(true);
  });
  it("v_llm_usage_daily: 단가가 없으면 비용 null, 넣으면 계산", async () => {
    const before = (await asUser(T, (q) => q("select * from public.v_llm_usage_daily"))).rows[0];
    expect([Number(before.input_tokens), before.est_cost_usd]).toEqual([2000, null]);
    await pool.query("insert into public.llm_prices (model, input_per_mtok, output_per_mtok, cache_read_per_mtok, cache_write_per_mtok) values ('claude-haiku-5-5', 1, 5, 0.1, 1.25)");
    const after = (await asUser(T, (q) => q("select * from public.v_llm_usage_daily"))).rows[0];
    expect(Number(after.est_cost_usd)).toBeCloseTo((2000 * 1 + 400 * 5 + 1000 * 0.1) / 1e6, 6);
  });
});

describe("삭제 (R10)", () => {
  it("다른 교사는 이 반 학생을 지울 수 없다", async () => {
    expect(await errorOf(svc("select public.app_delete_student($1, $2)", [T2, S]))).toContain("forbidden");
  });
  it("학생 삭제 시 세션 하위 기록이 모두 cascade로 지워진다", async () => {
    const counts = async () => Promise.all(CHILD_TABLES.map(async (t) => Number((await pool.query(`select count(*) n from public.${t} where session_id = $1`, [sess])).rows[0].n)));
    expect((await counts()).every((n) => n > 0)).toBe(true);
    expect((await svc("select public.app_delete_student($1, $2) as n", [T, S])).rows[0].n).toBe(1);
    expect(await counts()).toEqual(CHILD_TABLES.map(() => 0));
    expect(Number((await pool.query("select count(*) n from public.profiles where id = $1", [S])).rows[0].n)).toBe(0);
  });
  it("보존 기간 정리: 활동이 오래된 학생만 지운다", async () => {
    await pool.query("update public.sessions set updated_at = now() - interval '14 months' where student_id = $1", [K]);
    await pool.query("update public.profiles set created_at = now() - interval '14 months' where id = $1", [K]);
    const n = (await pool.query("select private.purge_inactive_students(12) as n")).rows[0].n;
    expect(n).toBe(1);
    expect(Number((await pool.query("select count(*) n from public.profiles where id in ($1, $2)", [K, N])).rows[0].n)).toBe(1);
  });
  it("반 삭제: 반·과제가 지워지고 이 반에만 있던 학생 계정도 지워진다", async () => {
    expect(await errorOf(svc("select public.app_delete_class($1, $2)", [T2, cls]))).toContain("forbidden");
    expect((await svc("select public.app_delete_class($1, $2) as n", [T, cls])).rows[0].n).toBe(1);
    expect(Number((await pool.query("select count(*) n from public.assignments where class_id = $1", [cls])).rows[0].n)).toBe(0);
    expect(Number((await pool.query("select count(*) n from public.profiles where id = $1", [N])).rows[0].n)).toBe(0);
  });
});
