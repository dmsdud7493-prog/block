# 배포 안내 (GitHub · Supabase · Vercel · Claude API)

이 문서는 **선생님(또는 학교 담당자) 계정으로만 할 수 있는 일**을 순서대로 적었습니다.
코드는 이미 준비되어 있고, 아래 단계를 마치면 학생 로그인·저장·교사 대시보드·AI 도우미가 켜집니다.
값이 비어 있어도 앱은 **체험 모드**(로그인·저장 없음)로 동작합니다.

> 🔐 API 키·비밀번호·토큰은 채팅·이슈·커밋에 붙여 넣지 마세요. Vercel/Supabase/GitHub의 "환경 변수·Secrets" 칸에만 넣습니다. 노출되었으면 즉시 새로 발급하고 이전 키를 폐기하세요.

---

## 0. 준비물

- GitHub 계정, Supabase 계정, Vercel 계정, Anthropic Console 계정
- 로컬: Node.js 22, Git, (선택) [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

## 1. GitHub 저장소

```bash
cd app
git remote add origin https://github.com/<내 계정>/matter-lab.git   # GitHub에서 빈 저장소를 먼저 만듭니다
git push -u origin main
git checkout -b develop && git push -u origin develop               # develop = 스테이징, main = 운영
```

- `.github/workflows/ci.yml`: PR마다 lint·타입·단위·DB(Postgres 16)·E2E·하네스 verify
- `.github/workflows/supabase.yml`: `develop`/`main`에 마이그레이션이 바뀌면 해당 Supabase 프로젝트에 `db push`
  - 저장소 **Settings → Secrets and variables → Actions**에 추가:
    `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_ID`, `PRODUCTION_PROJECT_ID`, `STAGING_DB_PASSWORD`, `PRODUCTION_DB_PASSWORD`

## 2. Supabase (스테이징·운영 2개 프로젝트)

1. **New project** → Region **Northeast Asia (Seoul)** → DB 비밀번호 저장(비밀번호 관리자에).
2. 마이그레이션·시드 적용 (프로젝트마다):
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push                 # supabase/migrations/0001~0008
   ```
   이어서 **SQL Editor**에서 `supabase/seed.sql` 내용을 실행합니다(실험 6종 목록).
3. **Authentication**
   - 공개 회원가입 끄기(“Allow new users to sign up” 해제). 교사 계정은 앱의 교사 가입 화면(도메인 허용 목록)에서 서버가 만들고, 학생 계정은 교사가 만듭니다.
   - **Hooks → Custom Access Token**: `public.custom_access_token_hook` 연결(역할 클레임).
4. **API 키**: Project Settings → API에서 URL, publishable(anon) 키, service_role(secret) 키를 확인 → 3단계 Vercel 환경 변수로.
5. **Realtime**: 마이그레이션 0006이 `events`·`submissions`를 `supabase_realtime` 발행에 넣습니다(교사 대시보드만 구독, RLS 적용).
6. **보존 기간 정리(선택, 권장)** — Database → Extensions에서 `pg_cron`을 켠 뒤:
   ```sql
   -- 매월 1일 03:00, 마지막 활동 후 12개월 지난 학생 계정·기록 삭제 (기간은 학교가 정함)
   select cron.schedule('purge-students', '0 3 1 * *', $$select private.purge_inactive_students(12)$$);
   ```
7. **LLM 단가(비용 집계용)** — 저장소에 가격을 적어 두지 않습니다. 공식 가격표([docs.claude.com](https://docs.claude.com)의 Pricing 문서)를 보고 넣으세요(USD / 100만 토큰):
   ```sql
   insert into public.llm_prices (model, input_per_mtok, output_per_mtok, cache_read_per_mtok, cache_write_per_mtok)
   values ('claude-haiku-5-5', <입력>, <출력>, <캐시 읽기>, <캐시 쓰기>)
   on conflict (model) do update set input_per_mtok = excluded.input_per_mtok, output_per_mtok = excluded.output_per_mtok,
     cache_read_per_mtok = excluded.cache_read_per_mtok, cache_write_per_mtok = excluded.cache_write_per_mtok, updated_at = now();
   ```
   일별 사용량·추정 비용: `select * from v_llm_usage_daily order by day desc;`
   지침별 파일럿 지표: `select * from v_guideline_metrics;`

## 3. Claude API 키

1. [Anthropic Console](https://console.anthropic.com) → API Keys → 새 키(이름 예: `matter-lab-prod`).
2. **Limits**에서 월 사용 한도를 정합니다(파일럿은 작게 시작).
3. 키는 4단계 Vercel 환경 변수 `ANTHROPIC_API_KEY`에만 넣습니다(서버 전용, `NEXT_PUBLIC_` 금지).

## 4. Vercel

1. **Add New → Project → Import** GitHub 저장소(루트 디렉터리 `app`이면 그렇게 지정). Framework: Next.js.
2. **Environment Variables** (Production = 운영 Supabase, Preview = 스테이징 Supabase):

   | 이름 | 값 | 비고 |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable(anon) 키 | 브라우저에 보여도 되는 키 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 | **서버 전용** |
   | `ANTHROPIC_API_KEY` | Claude API 키 | **서버 전용** |
   | `CLAUDE_MODEL_TUTOR` / `CLAUDE_MODEL_GRADER` | `claude-haiku-5-5` / `claude-sonnet-5-5` | |
   | `TEACHER_EMAIL_DOMAIN_ALLOWLIST` | 예: `sen.go.kr,school.ac.kr` | 교사 가입 허용 도메인 |
   | `STUDENT_EMAIL_DOMAIN` | 예: `students.matter-lab.invalid` | 메일 수신 안 함 |
   | `STUDENT_PIN_PEPPER` | 긴 무작위 문자열 | 바꾸면 PIN 재발급 필요 |
   | `TEXTBOOK_MODE` | `true` | 교과서 값 |
   | `DEMO_TUTOR_ENABLED` | `false` | 체험 모드에서 Claude 사용 여부 |

3. 함수 실행 지역은 `vercel.json`에서 서울(`icn1`)로 고정되어 있습니다.
4. **Domains**: 학교 망 차단을 줄이려면 커스텀 도메인을 연결하고, 학교 정보 담당자에게 도메인 + Supabase 주소를 허용 목록에 넣어 달라고 요청하세요.

## 5. 첫 수업 전 점검 (스테이징에서 먼저)

1. 교실 기기에서 `/netcheck` → 모두 ✅인지 확인.
2. 교사 가입 → 반 만들기 → 학생 번호 입력 → PIN 인쇄 → 보호자 동의서 받은 학생 체크 → 실험 배정.
3. 학생 계정으로: 설계 → 예측 → 실행 → 계산 → 그래프 → 예상 비교 → 보고서 → 제출.
4. 교사: 대시보드 4카드에 제출이 보이는지 → 채점 → **확정하고 돌려주기** → 학생이 고쳐 재제출 → "재제출" 표시 확인.
5. 학생이 AI 도우미에 위기 신호 문장을 입력 → 교사 대시보드 "확인할 AI 대화" 카드에 **10초 안에** 뜨는지(Realtime) 확인.
6. 부하 점검(스테이징 주소):
   ```bash
   node scripts/load/classroom.mjs --base https://<스테이징 주소> --vus 30 --seconds 600
   ```
   기준: 오류율 < 1%, `/api/tutor` p95 < 3초(첫 토큰 기준은 Vercel·Anthropic 대시보드 지표로 함께 확인). 결과를 `docs/perf-load.md`에 기록합니다.
7. 처리방침(`/privacy`)의 학교 이름·개인정보 보호책임자 연락처를 채우고 학교 검토를 받습니다.

## 6. 운영 중

- 학년 말: 반 상세 → **반 삭제**(학생 기록·이 반에만 있던 계정 영구 삭제). 필요한 보고서는 먼저 인쇄.
- 비용: `v_llm_usage_daily`의 `est_cost_usd`를 주 1회 확인. Console 월 한도 알림을 켜 두세요.
- 키 교체: Vercel 환경 변수를 바꾸고 재배포. `STUDENT_PIN_PEPPER`는 바꾸지 마세요(모든 PIN 무효).
