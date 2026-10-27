# architecture.md — 물질의 특성 가상실험실

> 마지막 업데이트: 2026-10-27 · 기준: `docs/plan.md` §3, `설계원리.md`

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프론트엔드 | Next.js 16 App Router (`src/`), React 19, TypeScript, Tailwind 4 | Vercel `icn1`(서울) |
| 블록 편집기 | Blockly 13 + 자체 React 래퍼 (`src/components/blocks`) | `next/dynamic`(ssr:false), `blockly/msg/ko` |
| 시뮬레이션 | `src/lib/engine` 순수 함수(결정론적 리듀서) | 브라우저·서버 공용 |
| 차트 | Recharts(결과), SVG 직접 그리기(예측 스케치) | 차트 옆 데이터 표 필수 |
| 백엔드 | Supabase: Auth, Postgres + RLS, Realtime(교사만), (선택) Edge Functions | 서울 리전 |
| DB 접근 | `@supabase/ssr` + `@supabase/supabase-js`, 게이트 로직은 Postgres 함수(RPC) | `supabase/migrations/*.sql` |
| AI | Claude API via AI SDK v7 (`ai`, `@ai-sdk/anthropic`) | 튜터 `CLAUDE_MODEL_TUTOR`, 채점 `CLAUDE_MODEL_GRADER` |
| 테스트 | Vitest(단위·골든·API·튜터 회귀 mock), 로컬 Postgres(RLS·RPC), Playwright(E2E), jest-axe | |

## 2. 데이터 흐름

```
브라우저(학생/교사)
  │  ① 블록 편집 → src/lib/engine dryRun (클라이언트, 서버 호출 없음) → 경고 배지·점검 패널   [지침 2.3, 1.3]
  │  ② 예측 저장  → POST /api/predict ─┐
  │  ③ 실행       → POST /api/run ─────┤  Route Handler (Node 런타임)
  │  ④ 계산값     → POST /api/check ───┤    ├─ zod 검증, getClaims()로 사용자 확인
  │  ⑤ 튜터 대화  → POST /api/tutor ───┤    ├─ src/lib/engine simulate()/check() (정답은 서버에서만)
  │  ⑥ 보고서     → PUT/POST /api/report/* ┤ ├─ Claude API (src/lib/tutor, 서버 전용 키)
  │  ⑦ 교사 채점  → POST /api/grade ───┘    └─ @supabase/ssr → Postgres (RLS + RPC 게이트)
  │
  └─ 교사 대시보드: Realtime(postgres_changes on events) 구독 — 교사 라우트에서만
```

- **게이트는 DB 함수에서 강제**한다: `record_run`(예측 없으면 `prediction_required`), `submit_report`(성찰 미작성 `reflection_required`), `start_session`(`consent_required`). Route Handler는 오류 코드를 HTTP 403/422로 변환할 뿐이다.
- Supabase 환경변수가 없으면 `/demo` 라우트만 동작한다(저장 없이 메모리 상태, 튜터는 로컬 규칙 응답). 수업 전 체험·E2E 테스트 용도.

## 3. 디렉토리 구조

```
src/
├── app/
│   ├── (auth)/login/            # C-01 학생(반 코드+학번+PIN) / 교사(이메일)
│   ├── lab/                     # S-01 과제 목록, [sessionId]/ S-02~S-08 (같은 화면 안에서 보고서 단계로 전환)
│   ├── dashboard/               # T-03 4카드, classes/[id] 반 관리, classes/[id]/live 실시간 보드, sessions/[id] 학생 상세, submissions/[id] 채점
│   ├── demo/[slug]/             # 로그인 없는 체험(메모리 상태)
│   ├── privacy/ netcheck/       # 처리방침, 망 점검
│   └── api/                     # tutor, check, run, predict, events, session/*, report/{draft,submit}, grade, class/*, demo/*, health
├── components/
│   ├── blocks/  monitor/  inquiry/  data/  tutor/  report/  teacher/  ui/
├── lib/
│   ├── engine/                  # dsl, simulator, rules, grader, experiments(6종), reference, guidelines.ts
│   ├── tutor/                   # prompts, schemas, ladder, stateInjection, safety, localTutor
│   ├── supabase/                # client.ts, server.ts, admin.ts, env.ts
│   ├── server/                  # 데이터 접근 계층(DAL) — Route Handler만 import
│   ├── events/                  # types.ts(이벤트 종류), fold.ts(학생별 상태·막힘), cards.ts(4카드)
│   └── report/                  # template.ts, rubric.ts, transcribe.ts
└── proxy.ts                     # 세션 쿠키 갱신 + 역할별 라우트 보호(낙관적 검사)
supabase/
├── config.toml
├── migrations/0001_init 0002_rls 0003_rpc 0004_tutor 0005_report 0006_teacher 0007_sketch 0008_compliance
└── seed.sql
tests/ unit/ db/ a11y/ e2e/
```

## 4. 데이터 모델 요약

`profiles`(role, display_name, consent_on_file) · `classes`(join_code, settings) · `enrollments` · `experiments`(spec 서버 전용, `experiments_public` 뷰) · `assignments` · `sessions`(seed, status, current_step, scaffold_level) · `block_programs`(version 누적) · `runs`(run_no 누적) · `measurements`(제시값/학생 입력, error_type, attempt) · `predictions`(choice, rationale, matched, rationale_after) · `reports`(content jsonb) · `submissions`(상태 머신) · `chat_messages`(meta.hint_level·usage, flagged) · `events`(불변 로그, payload.guideline) · `grade_audit_log` · `grade_drafts`(교사 전용 채점 초안) · `llm_prices` · 뷰 `v_llm_usage_daily`·`v_guideline_metrics`(security_invoker).

세부 컬럼은 `supabase/migrations/0001_init.sql`이 단일 진실 공급원이다.

## 5. API 응답 형식

모든 JSON Route Handler는 `{ data, error, status }` 형식으로 응답한다(`src/lib/server/respond.ts`). 오류 코드: `unauthorized`(401), `forbidden`·`prediction_required`·`consent_required`·`late_not_allowed`(403), `not_found`(404), `session_locked`·`not_submitted`(409), `invalid_input`·`reflection_required`·`invalid_rubric`(422), `rate_limited`(429), `upstream_unavailable`(503).

## 6. 승인 필요 영역 (사용자 승인 후 변경)

- `supabase/migrations/*.sql` (스키마·RLS·RPC)
- `src/lib/supabase/*`, `src/proxy.ts` (인증)
- `src/app/api/**` 의 권한 검사 부분
- `.env*`, `vercel.json`, `package.json` 의존성
- `설계원리.md` (수정 금지 — 원문 확정 시 사용자만 교체)

## 7. 환경변수

| 이름 | 범위 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 클라이언트·서버 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용(학생 일괄 생성) |
| `ANTHROPIC_API_KEY` | 서버 전용(`src/app/api/**`) |
| `CLAUDE_MODEL_TUTOR`(기본 `claude-haiku-5-5`), `CLAUDE_MODEL_GRADER`(기본 `claude-sonnet-5-5`) | 서버 |
| `TEXTBOOK_MODE`(기본 `true`) | 서버·엔진 |
| `TEACHER_EMAIL_DOMAIN_ALLOWLIST`, `STUDENT_EMAIL_DOMAIN`, `STUDENT_PIN_PEPPER` | 서버(계정) |
| `DEMO_TUTOR_ENABLED` | 서버(체험 모드 Claude 사용) |
| `APP_ENV` | `local`/`staging`/`production` |
