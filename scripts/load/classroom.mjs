#!/usr/bin/env node
/**
 * 교실 30명 동시 부하 (plan S9 · §6.3). 학생 1명 = VU 1개가 실제 수업처럼 반복한다:
 *   실행(/api/demo/run) → 계산값 확인(/api/demo/check) → AI 도우미 질문(/api/tutor, 체험 모드)
 * 사용: node scripts/load/classroom.mjs --base http://127.0.0.1:3100 --vus 30 --seconds 600 [--think 4000] [--ask 0.4]
 * 결과: 엔드포인트별 요청 수·오류율·p50/p95 지연(ms)을 JSON으로 출력.
 * 실제 배포(Supabase·Claude 연결) 측정은 같은 스크립트를 스테이징 주소로 돌린다(DEPLOY.md §부하 점검).
 */
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const BASE = arg("base", "http://127.0.0.1:3100");
const VUS = Number(arg("vus", "30"));
const SECONDS = Number(arg("seconds", "60"));
const THINK_MS = Number(arg("think", "4000"));
/** 실행 한 번마다 AI 도우미에게 물어볼 확률 (수업 관찰상 몇 번에 한 번) */
const ASK_RATE = Number(arg("ask", "0.4"));

const E = (id) => ({ kind: "equip", id });
const Q = (value, unit) => ({ kind: "quant", value, unit });
const steps = ["iron_big", "iron_small"].flatMap((iron, k) => [
  { action: "a4", slots: [E(iron)] }, { action: "a2", slots: [E("water"), Q(50, "mL")] },
  { action: "a7", slots: [E(iron), E("cylinder")] }, { action: "a8", slots: [E("cylinder")] }, { action: "a5", slots: [] },
].map((s, i) => ({ ...s, blockId: `b${k}-${i}` })));
const program = { experiment: "density", variables: [], steps };
const predictions = [{ target: "same_density", choice: "same", rationale: "같은 철이라서 같을 것 같다", hintsUsed: 0 }];
const context = {
  phase: "run", predictionTargetsDone: ["same_density"], diagnostics: [], checks: [], measurements: [], changedVars: [],
  runOk: true, idleSeconds: 30, lastHintLevel: -1, nudgeSent: false, reportSection: null,
};

const stats = new Map();
/** 429(속도 제한)는 의도된 보호 동작이라 오류와 따로 센다 */
const record = (name, ms, ok, limited = false) => {
  const s = stats.get(name) ?? { lat: [], errors: 0, limited: 0 };
  stats.set(name, { lat: [...s.lat, ms], errors: s.errors + (ok || limited ? 0 : 1), limited: s.limited + (limited ? 1 : 0) });
};

async function call(name, path, body, vu) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${vu}` }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    record(name, performance.now() - t0, res.ok, res.status === 429);
    return json?.data ?? null;
  } catch {
    record(name, performance.now() - t0, false);
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function student(vu, until) {
  try {
    for (let runNo = 1; Date.now() < until; runNo += 1) {
      const seed = `load-${vu}`;
      const run = await call("run", "/api/demo/run", { slug: "density", seed, runNo, program, predictions }, vu);
      const req = run?.calcRequests?.[0];
      if (req) await call("check", "/api/demo/check", { slug: "density", seed, runNo, program, key: req.key, value: 7.5, unit: "g/mL" }, vu);
      if (Math.random() < ASK_RATE) await call("tutor", "/api/tutor", { mode: "demo", slug: "density", seed, runNo, program, messages: [{ role: "user", content: "밀도는 어떻게 구해요?" }], context }, vu);
      await sleep(THINK_MS * (0.5 + Math.random()));
    }
  } catch {
    record("vu", 0, false);
  }
}

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]) : null;
};

const until = Date.now() + SECONDS * 1000;
await Promise.all(Array.from({ length: VUS }, (_, i) => student(i + 1, until)));
const report = Object.fromEntries([...stats].map(([k, v]) => [k, { requests: v.lat.length, errorRate: +(v.errors / Math.max(1, v.lat.length)).toFixed(4), rateLimited: v.limited, p50: pct(v.lat, 50), p95: pct(v.lat, 95) }]));
console.log(JSON.stringify({ base: BASE, vus: VUS, seconds: SECONDS, report }, null, 2));
