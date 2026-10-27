# 🔬 물질의 특성 가상실험실

중학교 과학(2022 개정 교육과정 ‘물질의 특성’) — **블록으로 실험을 설계하고, 결과를 먼저 예상한 뒤, 가상 실험으로 확인하고, 탐구 보고서를 쓰는** 학생용 앱과 교사 대시보드입니다.
모든 기능은 `설계원리.md`(6원리 × 4지침 = 24지침)를 따릅니다 → [`docs/design-principles-impl.md`](docs/design-principles-impl.md).

## 무엇을 할 수 있나

| 학생 | 교사 |
|---|---|
| 블록 코딩으로 실험 절차·변인 설계, 실시간 점검(오류 블록 표시) | 반·학생 계정(번호+PIN, 실명·이메일 없음), 보호자 동의 관리 |
| 실행 전 결과 예상 + 이유(힌트 3단계, 곡선 그리기) | 실험 배정·마감·지각 허용, 편집 중 점검 수준·말투·근거 게이트 설정 |
| 가상 실험 모니터(장면·재생·텍스트 기록), 측정값 표 | 대시보드 4카드: 막힌 학생 / 미제출·채점 / 확인할 AI 대화 / 공통 오답 |
| 계산값 직접 입력 → 틀리면 어디를 다시 볼지 안내(정답 비공개) | 실시간 보드(정렬), 학생 상세(블록·실행/그래프·예상·대화) |
| 그래프(이전 실행·두 집단·내 예상 겹치기), 예상과 비교 | 루브릭 채점(초안→확정·반환), 코멘트 뱅크, 감사 로그 |
| AI 실험 도우미(질문으로 이끌기, 대신 써 주지 않음) | 학생·반 데이터 영구 삭제, 지침별 지표·LLM 비용 뷰 |
| 9항목 탐구 보고서(기록 → 초안), 성찰 4질문, 제출·재제출 | |

실험 6종: 밀도, 녹는점, 끓는점, 용해도, 혼합물 분리 1(증류), 혼합물 분리 2(재결정).

## 기술 스택

Next.js 16(App Router) · React 19 · Tailwind 4 · Blockly 13 · Recharts · Supabase(Postgres·Auth·RLS·Realtime) · Vercel(서울 icn1) · Claude API(AI SDK v7, 튜터 `claude-haiku-5-5`) · Vitest · Playwright · [EduHarness](https://github.com/tigerjk9/Harness-Engineering)

## 빠르게 실행하기 (체험 모드)

```bash
npm install
cp .env.example .env.local     # 비워 두면 체험 모드(로그인·저장 없음)
npm run dev                    # http://localhost:3000 → "로그인 없이 체험하기"
```

학생 로그인·저장·교사 대시보드·Claude 튜터를 켜려면 [`DEPLOY.md`](DEPLOY.md)를 따라 Supabase·Claude API를 연결합니다.

## 테스트

```bash
npm run lint && npm run typecheck
npm test                         # 단위·접근성(jest-axe)
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/labtest npm run test:db   # 스키마·RLS·서버 함수 게이트 (로컬 Postgres 16)
NEXT_PUBLIC_E2E=1 npm run build && npm run test:e2e                                  # Playwright (실험 6종 흐름·axe·키보드)
bash .claude/skills/verify/verify.sh                                                 # EduHarness 검증 (SCORE·VERDICT)
node scripts/load/classroom.mjs --vus 30 --seconds 120                               # 교실 30명 부하 (서버 실행 중)
```

## 폴더 구조

```
src/app/            화면(학생 /lab·/demo, 교사 /dashboard, /privacy, /netcheck)과 API(/api/*)
src/lib/engine/     블록 DSL·결정론적 시뮬레이터·실험 6종·서버 채점 (물성·정답은 server-only)
src/lib/tutor/      AI 튜터: 힌트 사다리·상태 주입·안전·정답 누설 필터
src/lib/events/     이벤트 로그 → 교사 대시보드(fold·4카드)
src/lib/report/     보고서 틀·루브릭·초안 옮기기
src/components/     blocks · lab · monitor(장면) · data(표·그래프·예측) · tutor · report · teacher
supabase/migrations 스키마·RLS·서버 함수(app_*)·뷰
tests/              unit · a11y · db · e2e
docs/               plan · research · 지침 추적표 · 컴플라이언스 · KWCAG · 결정 기록 · 부하
```

## 핵심 원칙 (CLAUDE.md 요약)

- 정답·물성 값은 서버에만 — 학생 화면은 측정값만 받고, 계산값은 학생이 입력한다.
- 예상 없이 실행·그래프 공개 불가(DB 게이트), 실행 기록은 덮어쓰지 않고 쌓는다.
- AI는 질문으로 이끌고 문장을 대신 완성하지 않는다. 대화는 담당 교사가 볼 수 있음을 항상 알린다.
- 모든 쓰기는 service_role 전용 서버 함수로(RLS는 읽기 전용), 교사는 자기 반만 본다.

문서: [plan](docs/plan.md) · [research](docs/research.md) · [24지침 추적](docs/design-principles-impl.md) · [컴플라이언스](docs/compliance-checklist.md) · [KWCAG](docs/kwcag-checklist.md) · [결정 기록](docs/decision-log.md) · [파일럿](docs/pilot-checklist.md) · [보호자 동의서](docs/consent-letter.md) · [부하](docs/perf-load.md)
