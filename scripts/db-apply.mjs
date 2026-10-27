#!/usr/bin/env node
/**
 * 로컬 테스트 DB 초기화: (테스트 전용) auth 흉내 → supabase/migrations/*.sql → seed.sql
 * 안전장치: 데이터베이스 이름에 "test"가 없으면 실행하지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export async function applyAll(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL이 필요해요 (예: postgres://postgres:postgres@127.0.0.1:5432/labtest)");
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.includes("test")) throw new Error(`테스트 DB가 아니에요: ${dbName}`);
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("drop schema if exists public cascade; drop schema if exists private cascade; drop schema if exists auth cascade; drop schema if exists extensions cascade; create schema public;");
    await client.query(fs.readFileSync(path.join(root, "tests/db/auth-shim.sql"), "utf8"));
    const dir = path.join(root, "supabase/migrations");
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
      await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
    }
    await client.query(fs.readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  applyAll().then(() => console.log("DB 적용 완료"), (e) => { console.error(e.message); process.exit(1); });
}
