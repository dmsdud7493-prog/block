/** DB 테스트 도우미 — 역할·JWT 클레임을 트랜잭션 단위로 바꿔 Supabase 요청을 흉내 낸다 */
import pg from "pg";

export const URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/labtest";
export const pool = new pg.Pool({ connectionString: URL, max: 4 });

type Q = (sql: string, params?: unknown[]) => Promise<pg.QueryResult>;

async function inTx<T>(setup: string[], fn: (q: Q) => Promise<T>, commit: boolean): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    for (const s of setup) await c.query(s);
    const out = await fn((sql, params) => c.query(sql, params as unknown[]));
    await c.query(commit ? "commit" : "rollback");
    return out;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}

/** 서버(service_role)로 실행 — 결과를 남긴다 */
export const asService = <T>(fn: (q: Q) => Promise<T>) => inTx(["set local role service_role"], fn, true);

/** 로그인 사용자(authenticated)로 실행 — 읽기 검사용, 항상 롤백 */
export const asUser = <T>(uid: string, fn: (q: Q) => Promise<T>) =>
  inTx(["set local role authenticated", `select set_config('request.jwt.claims', '${JSON.stringify({ sub: uid, role: "authenticated" })}', true)`], fn, false);

export async function createUser(role: "student" | "teacher", name: string): Promise<string> {
  const r = await pool.query("insert into auth.users (email, raw_app_meta_data, raw_user_meta_data) values ($1, $2, $3) returning id",
    [`${name}-${Math.random().toString(36).slice(2)}@test.invalid`, { role }, { display_name: name }]);
  return r.rows[0].id as string;
}

/** 예외 메시지(게이트 코드)를 돌려준다 */
export async function errorOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "no_error";
  } catch (e) {
    return (e as Error).message;
  }
}
