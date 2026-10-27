# 「물질의 특성 가상실험실」 구현 계획서 (plan.md)

> 작성일 2026-10-27 · 기준 문서: `물질의 특성 가상실험실 에이전트 연구.md`(이하 **research.md**), `설계원리.md`(사용자 제공, 6원리×4지침=24지침), tigerjk9/Harness-Engineering 템플릿 분석(`harness_engineering.md`), 프로토타입 분석(`00_existing_prototypes.md`).
> 표기 규칙: research.md에 근거가 있는 항목은 절 번호(§)로 표시하고, 연구 근거 없이 본 계획서가 제안하는 항목은 **[제안]**으로 표시한다. 설계원리 지침은 "지침 3.1"처럼 번호로 인용한다.

---

## 0. 문서 목적·범위·전제

### 0.1 목적

이 문서는 Claude Code + EduHarness(`/edu-harness`)로 앱을 만드는 개발자(또는 에이전트)가 **Sprint 0부터 바로 착수**할 수 있도록, research.md의 권고를 실행 가능한 스프린트 계약·파일 구조·데이터 모델·수용 기준으로 번역한 엔지니어링 계획서다. research.md가 "무엇을, 왜"라면 이 문서는 "어떤 순서로, 어떤 파일에, 어떤 검증으로"를 다룬다.

### 0.2 범위

- 포함: 학생용 가상실험실(블록 설계 → 예측 → 시뮬레이션 → 데이터·그래프 → 보고서·성찰 → 제출), AI 튜터, 교사 대시보드, 인증·데이터 모델, 컴플라이언스, 하네스 구성, 테스트 전략.
- 제외: 실제 교과서 콘텐츠 저작(교사가 `KNOWLEDGE_BASE`를 작성), 결제, LMS 연동, 모바일 네이티브 앱.

### 0.3 고정 제약(사용자 지정)

| 항목 | 값 |
|---|---|
| 프론트엔드 | Next.js App Router, Vercel(서울 `icn1`) |
| 백엔드 | Supabase(서울 리전) — Auth·Postgres·RLS·Realtime·(선택) Edge Functions |
| 코드 | GitHub(템플릿 "Use this template" → 신규 리포) |
| 하네스 | tigerjk9/Harness-Engineering (EduHarness) |
| AI | Claude API (Haiku 5.5 튜터, Sonnet 5.5 채점·피드백) |
| 교육과정 | 2022 개정 중학교 과학 (8) 물질의 특성 [9과08-01]~[9과08-03] |
| 통치 문서 | `설계원리.md` 24지침 — 모든 구현이 따른다 |

### 0.4 핵심 결정 사항 표

| # | 결정 | 근거(research.md) | 영향 스프린트 |
|---|---|---|---|
| D1 | 프로토타입 6종을 버리지 않고 **공통 엔진**(블록 DSL + `applyStep` 리듀서 + 실험별 spec)으로 승격 | §1 결정 1, §2 | S1 |
| D2 | 블록 편집기는 **Blockly core v13 + 자체 React 래퍼**(react-blockly 비사용), `msg/ko`, `next/dynamic({ssr:false})` | §1 결정 2, §6 | S2 |
| D3 | 변인 설계 블록 카테고리 신설(`variable`), 시도 보존용 `runs` 테이블 — 데이터 모델을 바꾸므로 S1에서 확정 | §3 (지침 2.1, 3.4), §12 다음 단계 (3) | S1, S3 |
| D4 | 편집 중 검증(dry-run)과 실행 검증이 **같은 규칙 엔진** 공유, 2계층(블록 로컬 즉시 / 절차 전역 디바운스) | §6 "실시간 검증은 2계층" | S2 |
| D5 | 튜터 = **4단 힌트 사다리**(L0~L3), 2회 실패/3분 정체 시 자동 하강, 페이딩 | §1 결정 3, §5 | S4 |
| D6 | **예측 게이트**를 UI와 서버 양쪽에서 잠금(`predictions` 행 없으면 `/api/run`·그래프 403) | §1 결정 4, §5, §10 수정 4 | S5 |
| D7 | 계산값 채점은 **서버 코드**가 수행, 모델은 `error_type`만 받음 | §1 결정 5, §5 "계산값 검증" | S5 |
| D8 | 모델 2티어: `CLAUDE_MODEL_TUTOR=claude-haiku-5-5`, `CLAUDE_MODEL_GRADER=claude-sonnet-5-5`, 환경변수로 분리 | §1 결정 6, §7 | S4, S6 |
| D9 | Claude 호출은 **Next.js Route Handler(Node 런타임)** 전용. Supabase Edge Function은 웹훅·크론·PDF만 | §1 결정 7, §7 | S4 |
| D10 | 프롬프트 캐싱(시스템+KB 블록에 `cacheControl: ephemeral`), 구조화 출력(`json_schema`, `hint_level`은 `enum`) | §7 | S4 |
| D11 | 교사 대시보드는 **불변 `events` 로그**를 접어 4카드(막힘/미제출/플래그/공통 오답)로 시작, 학생에겐 순위·반 평균 비노출 | §1 결정 8, §8 | S7 |
| D12 | 학생 계정 = 학급 코드 + 학번/닉네임 + PIN(실명·이메일 미수집), 보호자 동의는 학교 서면 → `consent_on_file` | §1 결정 9, §9 | S3, S9 |
| D13 | `설계원리.md`를 CLAUDE.md 필수 읽기로 등록, 지침 번호를 스프린트 계약·verify.sh·pedagogy-reviewer에 연결, `docs/design-principles-impl.md` 작성 | §1 결정 10, §10 | S0 |
| D14 | 참조 물성은 `TEXTBOOK_MODE` 상수로 교과서/NIST 값 전환 | §6 참조 물성 데이터 | S1 |
| D15 | 결과 차트 Recharts, 예측 그리기 Chart.js + dragdata; 모니터는 SVG+CSS, 입자만 canvas | §6 차트·모니터 | S5, S8 |
| D16 | 말투는 해요체 기본 + 교사 설정으로 반말 허용 | §5 한국어 프롬프트 | S4 |

---

## 1. 제품 범위 정의

### 1.1 MVP(필수) / 2차 / 보류

| 구분 | 기능 | 요구사항 번호 | 근거 |
|---|---|---|---|
| **MVP** | 공통 엔진·Blockly 편집기·모니터·2계층 검증 | (4)(5)(6)(9) | §2, §6 |
| **MVP** | 변인 설계 블록 + 탐구 카드 5칸 + 단계 스테퍼 | (2) | 지침 1.1·1.4·2.1 |
| **MVP** | 로그인(학급 코드·학번·PIN), 세션 저장, `runs` 보존 | (15) | 지침 3.4, §7 |
| **MVP** | AI 튜터(힌트 사다리·상태 주입·안전 프롬프트) | (1)(3) | §5 |
| **MVP** | 데이터 표(측정값 제시 + 계산값 입력·코드 채점) | (7)(10) | §5 |
| **MVP** | 예측 게이트 + 결과 그래프 | (8)(13) | §5 |
| **MVP** | 보고서 9항목·성찰 4질문·제출 게이트 | (11)(12)(14) | 지침 6.1~6.4 |
| **MVP** | 교사: 반 생성·과제 배정·제출 보드·채점·반환 | (14)(15) | §8 |
| **MVP** | 실험 6종 전부(단, 밀도부터 순차 완성) | (17) | §4 |
| **MVP** | 컴플라이언스 기본(동의 플래그·처리방침·AI 고지·플래그 알림) | — | §9 |
| 2차 | 예측 곡선 직접 그리기 위젯(Chart.js dragdata), 이전 실행 오버레이 | (8)(13) | §6 [제안] |
| 2차 | 학급 데이터 공유 뷰(여러 학생 측정값 한 그래프), CSV 내보내기, 코멘트 뱅크 | — | §8 ⑧⑨ |
| 2차 | 대조 실험 프리셋 5종(오개념 겨냥) | — | §4 [제안] |
| 2차 | AI 피드백 초안(Sonnet) → 교사 확정, Batch API 일괄 채점 | (14) | §8 |
| 2차 | 지침별 파일럿 지표 집계(타당화 리포트) | (16) | §3 |
| 보류 | 축 선택·눈금 결정 학생 모드, PDF 내보내기(Edge Function), 다중선택 플러그인, 보호자 요약 | — | §4·§6 추론 |

### 1.2 실험 6종의 구현 순서와 이유

| 순서 | 실험 | 성취기준 | 선택 이유 |
|---|---|---|---|
| 1 | **밀도** | 08-01 | 시간 축이 없어 리듀서가 가장 단순. 영점조정·"질량 재기 전 물에 넣음" 등 순서 오류의 원형이 있고(§2), 계산값 입력(밀도=질량÷부피)과 오류 유형(`swapped/unit/meniscus/decimal`)이 가장 명확해 요구사항 (10)의 기준 구현이 된다. 질량–부피 그래프는 신규(§2 갭표). |
| 2 | **녹는점** | 08-01 | 가열 곡선 모델(구간별 선형 + 물중탕 S자)을 처음 도입. 평탄 구간 읽기(`plateau`)와 "양을 바꿔도 같다"(3 g vs 6 g) 대조 실험이 변인 블록의 첫 실사용(§4 SERC). |
| 3 | **끓는점** | 08-01, 08-02 | 녹는점과 동일 모델 재사용 + 가열 세기 변인 + 순물질/혼합물 판별. 모델 공유로 비용이 작다. |
| 4 | **용해도** | 08-01 | 물 100 g 환산(`solvent_basis`)이라는 독립 오류 유형과 용해도 곡선 그래프(신규)가 필요. 온도 블록·포화 판정 로직이 분리2의 전제. |
| 5 | **혼합물 분리 1(증류)** | 08-03 | 끓는점 모델 확장(증류 보간식) + '위치' 블록 카테고리 추가. 1~3이 끝나야 설계 단계("순물질 특성값 조회 → 방법 선택")가 성립. |
| 6 | **혼합물 분리 2(재결정)** | 08-03 | 용해도 표·석출량 계산(`precipitate = dissolved − S(T_low)·water/100`)을 4에서 재사용. 가장 많은 블록·단계를 가지므로 마지막. |

---

## 2. 사용자 흐름

화면 ID 규약: `S-xx` 학생, `T-xx` 교사, `C-xx` 공통. 각 단계에 관련 지침 번호를 표기한다.

### 2.1 학생 흐름

| 단계 | 화면 ID / 라우트 | 내용 | 지침 |
|---|---|---|---|
| 1 | `C-01 /login` | 학급 코드 + 학번(또는 닉네임) + PIN 입력. "AI 튜터와 대화하며, 선생님이 열람할 수 있어요" 고지 1회 확인. | — (§9) |
| 2 | `S-01 /lab` | 배정된 실험 목록(마감일·상태). 과제 카드 클릭 → 세션 생성(`sessions` + `seed`). | 1.4 |
| 3 | `S-02 /lab/[sessionId]` 상단 | **단계 스테퍼** 설계→예측→수행→해석→보고서(`aria-current`) + **탐구 카드 5칸**(문제/가설/변인/절차=블록/예상). | 1.1, 1.4 |
| 4 | `S-02` 우상단 튜터 패널 | 개념 대화(KB 비유 우선). 실험 소개 질문 칩 3개. | 5.1, 4.2 |
| 5 | `S-02` 좌측 Blockly | **변인 설계** 탭에서 독립/종속/통제변인·집단·측정 방법 블록 배치 → 준비물/수치/행동(/위치) 블록으로 절차 조립. 변인 블록이 행동 블록 수치 슬롯을 참조. | 2.1, 2.2, 1.2 |
| 6 | `S-02` 블록 경고 + "실험 점검" 패널 | 편집 중 **실시간 검증**: 빈 슬롯·범위(즉시) + 모순·누락(dry-run, 디바운스). 블록 테두리 색 + 배지 카운트 + `aria-live` 요약. 자동 완성 없음, "예시 순서 3단계만". | 2.3, 2.4, 1.3 |
| 7 | `S-03` 예측 게이트(모달/패널) | [▶ 실행] 버튼 잠금 → 객관식 결과 모양 + "왜냐하면" 1줄 → `predictions` 저장 후 해제. 예측 못 하면 P1~P3 힌트. | 3.1 |
| 8 | `S-02` 모니터 | 실행 → 프레임 재생(0.5×/1×/2×), 오류 블록 깜빡임 + 배너, 텍스트 로그. "잘못된 값이 기록됨" 분기. | 3.2, 5.3 |
| 9 | `S-04` 데이터 표 | 측정값은 시드 노이즈로 제시, **계산값 셀은 학생 입력** → `/api/check` 코드 채점 → `error_type` → 튜터가 셀 지목 힌트. | 5.3, 4.1 |
| 10 | `S-05` 그래프 | 예측 완료 후 공개. Recharts(평탄 구간 음영), 이전 실행 오버레이, 옆에 데이터 표. "예측과 같았어? 달랐다면 왜?" 입력 → `predictions.matched/rationale_after`. | 3.3, 3.4, 1.3 |
| 11 | `S-02` 재실행 | 조건 바꿔 재실행 → `runs.run_no+1`, `block_programs.version+1`, 변경 diff 보존. | 3.4 |
| 12 | `S-06 /lab/[sessionId]/report` | 9항목 보고서. 우측 "내 기록" 패널(최종 블록·runs 비교·예측·변경 내역). AI는 질문 1·시작어 1·루브릭 지적 1만. | 6.1, 6.2, 6.3, 5.4 |
| 13 | `S-06` 성찰 섹션 | 4질문(예상–결과 차이 / 어려웠던 점·해결 / 더 알고 싶은 점 / 실생활 연결). | 6.4 |
| 14 | `S-07` 제출 | 체크리스트 게이트(성찰 3항목 미작성 시 버튼 비활성·안내), "AI 도움 받은 부분" 체크 → `submissions` 생성, 세션 `submitted` 잠금. | 6.4 |
| 15 | `S-08` 반환 보기 | 교사 피드백·루브릭 점수 열람 → 재제출(`resubmitted`, version+1). | 6.4 |

### 2.2 교사 흐름

| 단계 | 화면 ID / 라우트 | 내용 | 지침 |
|---|---|---|---|
| 1 | `C-01 /login` | 이메일 로그인(교사 계정은 관리자 승격 또는 학교 도메인 화이트리스트, §7). | — |
| 2 | `T-01 /dashboard/classes` | 반 생성 → 6자리 `join_code` 발급, 학생 일괄 생성(학번·PIN, service role 서버 액션). | — |
| 3 | `T-02 /dashboard/classes/[id]/assign` | 실험 배정 + 마감일 + 교사 설정(편집 중 힌트 수준 없음/빈 슬롯만/전부, 말투, 시도 제한, 변인 근거 게이트 on/off). | 2.4, 4.4 |
| 4 | `T-03 /dashboard` | **4카드**: 막힌 학생 / 미제출·지각 / 플래그된 AI 대화 / 공통 오답 상위 3 + 각 카드의 다음 행동. Realtime 구독(교사만). | 1.4(교사 뷰) |
| 5 | `T-04 /dashboard/classes/[id]/live` | 실험별 학생 행(현재 단계·시도 횟수·소요 시간·예측 일치·계산값 정오). 학생 클릭 → 블록·그래프·대화 탭. | 5.1 |
| 6 | `T-05 /dashboard/submissions/[id]` | 보고서 열람 + 루브릭 4항목(상/중/하) 채점 + 코멘트 + (2차) AI 피드백 초안 확정 → 반환. | 6.3 |
| 7 | `T-04` | 반환/재제출 상태 추적, 마감 후 제출 허용 토글, CSV(2차). | — |

---

## 3. 시스템 아키텍처

### 3.1 디렉토리 구조 (Next.js App Router 단일 리포 + 하네스)

```
repo/
├── CLAUDE.md  AGENTS.md  architecture.md  progress.md  HARNESS_CHANGELOG.md
├── 설계원리.md                         # 사용자 원문, 수정 금지(타당화 대상)
├── docs/
│   ├── design-principles-impl.md      # 24지침 ↔ 구현 위치·검증·지표·타당화 상태
│   ├── education-principles.md  verification-rubric.md  wcag-checklist.md  decision-log.md
│   └── compliance-checklist.md        # §7 체크리스트 (스프린트 배치)
├── .claude/
│   ├── settings.json                  # PostToolUse/UserPromptSubmit + Stop hook + deny rule
│   ├── agents/{planner,coder,evaluator,reviewer,tester,pedagogy-reviewer,harness-auditor}.md
│   ├── hooks/{harness-checkpoint,harness-evolve,harness-health,system-check,stop-verify}.sh
│   └── skills/{quickstart,edu-harness,execution-loop,objective-loop,verify}/
├── .husky/pre-commit
├── .github/workflows/{ci,generate-types,release-staging,release-prod}.yml
├── vercel.json                        # { "regions": ["icn1"] }
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (student)/lab/page.tsx                         # S-01
│   ├── (student)/lab/[sessionId]/page.tsx             # S-02~S-05
│   ├── (student)/lab/[sessionId]/report/page.tsx      # S-06~S-08
│   ├── (teacher)/dashboard/page.tsx                   # T-03
│   ├── (teacher)/dashboard/classes/...                # T-01, T-02, T-04
│   ├── (teacher)/dashboard/submissions/[id]/page.tsx  # T-05
│   ├── netcheck/page.tsx                              # 망 점검 페이지(§9)
│   └── api/
│       ├── tutor/route.ts            # 스트리밍 대화 (Haiku)
│       ├── check/route.ts            # 계산값 코드 채점 (비LLM)
│       ├── run/route.ts              # 실행 기록(runs) + 예측 게이트 서버 가드
│       ├── predict/route.ts          # 예측 저장·사후 설명
│       ├── report/draft/route.ts     # 자동저장
│       ├── report/submit/route.ts    # 제출 게이트 서버 검증
│       ├── report/feedback/route.ts  # (2차) Sonnet 구조화 피드백 초안
│       ├── grade/route.ts            # 교사 루브릭 채점·반환
│       └── class/{create,join,assign}/route.ts
├── components/
│   ├── blocks/BlocklyWorkspace.tsx   # 자체 래퍼 (inject/dispose/addChangeListener)
│   ├── monitor/{LabMonitor,FramePlayer,ParticleCanvas}.tsx
│   ├── inquiry/{StepStepper,InquiryCards,CheckPanel}.tsx
│   ├── data/{DataTable,CalcCell,ResultChart,PredictionGate,PredictDraw}.tsx
│   ├── tutor/{TutorPanel,HintLadderBadge}.tsx
│   ├── report/{ReportForm,MyRecordsPanel,ReflectionForm,SubmitGate}.tsx
│   └── teacher/{FourCards,LiveBoard,RubricGrader}.tsx
├── lib/
│   ├── engine/                        # 서버/클라 공용 순수 함수 (브라우저·Node 모두)
│   │   ├── dsl/{schema.ts,blocks.ts,toBlockly.ts,fromBlockly.ts}
│   │   ├── simulator/{state.ts,applyStep.ts,simulate.ts,dryRun.ts,rng.ts,models/{heating,solubility,density,distill}.ts}
│   │   ├── rules/{preconditions.ts,diagnostics.ts,variables.ts}
│   │   ├── grader/{check.ts,errorTypes.ts,tolerance.ts}
│   │   ├── experiments/{density,melting,boiling,solubility,separation1,separation2}.ts
│   │   ├── reference/{materials.ts,solubilityTable.ts,textbookMode.ts}
│   │   └── guidelines.ts              # 지침 ID 상수 테이블 (번호 변경 대비)
│   ├── tutor/{prompts/common.ts,prompts/experiments/*.ts,schemas.ts,ladder.ts,stateInjection.ts,safety.ts}
│   ├── supabase/{client.ts,server.ts,proxy.ts,admin.ts}
│   ├── events/{log.ts,fold.ts}        # 이벤트 기록 + 대시보드 폴딩
│   └── report/{template.ts,rubric.ts,transcribe.ts}
├── supabase/
│   ├── config.toml
│   ├── migrations/0001_init.sql ... 000N_*.sql
│   ├── seed.sql                       # experiments 6종 spec 시드
│   └── functions/{on-submit-notify}/  # (선택) DB Webhook → 교사 알림
├── tests/
│   ├── unit/engine/*.test.ts          # 골든 테스트, 리듀서, 채점
│   ├── unit/tutor/*.test.ts           # 프롬프트 회귀(고정 fixture)
│   ├── rls/*.test.ts                  # 역할별 RLS
│   ├── a11y/*.test.tsx                # jest-axe
│   └── e2e/*.spec.ts                  # Playwright
├── types/database.ts                  # supabase gen types
└── fixtures/prototypes/*.json         # 프로토타입 6종 블록 시나리오·기대 결과
```

### 3.2 데이터 모델

research.md §7 스키마를 기준으로 하고, 지침 3.4를 위해 `runs`를, 교사 설정을 위해 `assignments`를 추가한다(**[제안]** 표시 열 참조).

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `profiles` | `id`(auth.users FK), `role app_role('student','teacher','admin')`, `display_name`(학번/닉네임), `school`, `consent_on_file bool`, `consent_date` | 실명·이메일 비저장(학생) |
| `classes` | `id`, `teacher_id`, `name`, `join_code text unique`, `settings jsonb` | `settings`: `{hint_level_editing:'none'|'slots'|'all', tone:'haeyo'|'banmal', max_runs:int|null, rationale_gate:bool}` [제안] |
| `enrollments` | `(class_id, student_id)` PK | |
| `experiments` | `id`, `slug`, `title`, `spec jsonb`, `is_published` | `spec`에 허용 블록·정답 범위·시뮬 파라미터·KB — **클라이언트 응답 제외** |
| `assignments` [제안] | `id`, `class_id`, `experiment_id`, `due_at`, `allow_late bool`, `settings_override jsonb` | 과제 배정·마감 |
| `sessions` | `id`, `student_id`, `class_id`, `experiment_id`, `assignment_id`, `seed text`, `status('in_progress','submitted','returned','resubmitted')`, `current_step text`, `scaffold_level int`, `started_at`, `submitted_at` | `scaffold_level` = 지침 4.4 페이딩 프로파일 |
| `block_programs` | `id`, `session_id`, `program jsonb`, `version int`, `saved_at` | Blockly JSON + 변인 블록 |
| `runs` [제안, §3 지침 3.4] | `id`, `session_id`, `run_no int`, `program_version int`, `seed text`, `params jsonb`, `result_summary jsonb`, `diagnostics jsonb`, `created_at` | 시도 보존·비교 오버레이 |
| `measurements` | `id`, `session_id`, `run_id`, `key text`, `value numeric`, `unit text`, `is_student_input bool`, `is_correct bool`, `error_type text`, `attempt int` | 측정값(제시) + 계산값(입력) |
| `predictions` | `id`, `session_id`, `run_id`, `target text`, `choice text`, `rationale text`, `matched bool`, `rationale_after text` | 예측 게이트·사후 설명 |
| `reports` | `session_id` PK, `content jsonb`, `ai_assisted_sections text[]`, `version int`, `updated_at` | 9항목 JSONB |
| `submissions` | `id`, `session_id unique`, `submitted_at`, `late bool`, `rubric_scores jsonb`, `teacher_feedback text`, `ai_feedback jsonb`, `returned_at`, `version int` | 상태 머신 |
| `chat_messages` | `id`, `session_id`, `role('user','assistant')`, `content`, `meta jsonb`(`hint_level`, `usage`, `cache_read`), `flagged bool`, `created_at` | |
| `events` | `id`, `session_id`, `event_type`, `payload jsonb`(`guideline` 태그 포함), `ts` | 불변 로그, 대시보드 원천 |

JSONB 스키마(핵심):

```ts
// experiments.spec (서버 전용)
type ExperimentSpec = {
  slug: 'density'|'melting'|'boiling'|'solubility'|'separation1'|'separation2';
  standards: string[];                      // ['9과08-01']
  palette: { categories: BlockCategory[]; allowedBlocks: string[] };
  variables: { independent: string[]; dependent: string[]; controlled: string[] };
  simParams: Record<string, number>;        // 물성, 노이즈 폭, TEXTBOOK_MODE
  answers: { key: string; formula: string; tolerance: Tolerance }[];   // 계산값 정답 규칙
  predictionTargets: { id: string; choices: string[] }[];
  knowledgeBase: string;                    // 튜터 KB (~4k 토큰)
  exampleSteps: string[];                   // "예시 순서 3단계만"
};
// reports.content
type ReportContent = { title; goal; hypothesis; variables:{independent,dependent,controlled[]};
  materials:string[]; procedure:string; results:{tableRef:string; chartRef:string};
  interpretation:{trend; hypothesisVerdict:'supported'|'rejected'|'unclear'; evidence; errorSources; improvements};
  reflection:{diff; hardest; curious; realLife} };
```

### 3.3 RLS 정책 요약

| 테이블 | select | insert | update | 비고 |
|---|---|---|---|---|
| `profiles` | 본인 / 교사는 자기 반 학생 | service role만 | 본인(`display_name`만) | |
| `classes` | 교사 본인 / 학생은 등록된 반 | 교사 | 교사 본인 | `join_code`는 RPC `join_class`로만 조회 |
| `sessions` | 학생 본인 / 교사는 `class_id in my_teaching_class_ids()` | 학생 본인 | 학생 본인 & `status='in_progress'` / 교사는 반환 상태 변경 | §7 패턴 |
| `block_programs`, `runs`, `measurements`, `predictions`, `reports`, `chat_messages`, `events` | 세션 소유 학생 / 세션 반 담당 교사 | 세션 소유 학생(`in_progress`일 때) | 동일 | 모두 `session_id → sessions` 경유, `security definer` 헬퍼로 재귀 차단 |
| `submissions` | 학생 본인 / 담당 교사 | 서버(`/api/report/submit`) | 교사(채점·반환) | 학생 직접 update 금지 |
| `experiments` | 모든 authenticated — 단 **`spec` 컬럼은 view `experiments_public`로만**(answers·simParams 제외) | admin | admin | 정답 비노출 |

원칙: 연산별 정책 분리, `(select auth.uid())` 사용, `app_metadata.role` 클레임, `getClaims()`로 서버 검증(§7).

### 3.4 API 라우트 목록

| 라우트 | 메서드 | 입력(zod) | 출력 `{data,error,status}` | 모델/특이 |
|---|---|---|---|---|
| `/api/tutor` | POST(stream) | `{sessionId, messages}` | UIMessageStream | Haiku, 캐시, `maxDuration=120` |
| `/api/check` | POST | `{sessionId, runId, key, value, unit}` | `{correct, error_type, attempt}` | LLM 없음, 서버 재계산 |
| `/api/run` | POST | `{sessionId, program, programVersion}` | `{runId, frames, measurements(제시값만), diagnostics}` | **예측 없으면 403** |
| `/api/predict` | POST/PATCH | `{sessionId, runId?, target, choice, rationale}` / `{predictionId, matched, rationale_after}` | `{predictionId}` | |
| `/api/report/draft` | PUT | `{sessionId, content, aiAssisted[]}` | `{version}` | 자동저장(디바운스 2s) |
| `/api/report/submit` | POST | `{sessionId}` | `{submissionId, late}` | 성찰 3항목·결론 필수 검증 |
| `/api/report/feedback` | POST | `{submissionId}` | 구조화 피드백 초안 | Sonnet, 비스트리밍 json_schema (2차) |
| `/api/grade` | POST | `{submissionId, rubricScores, feedback, action:'return'}` | `{returnedAt}` | 교사 전용 |
| `/api/class/create` `/join` `/assign` | POST | 각 스키마 | | `join`은 RPC 호출 |
| `/api/events` | POST | `{sessionId, type, payload}` | | 클라 이벤트 배치 기록 |

### 3.5 Claude 호출 설계

**모델**: 튜터 `claude-haiku-5-5`, 채점·피드백·오개념 진단·교사 요약 `claude-sonnet-5-5`(§7). 모델 ID는 환경변수로만.

**튜터 시스템 프롬프트 구성(순서 = 캐시 프리픽스 순서)**:
1. `TUTOR_RULES`(공통부, §5 예시 프롬프트 기반, 정적) — 캐시 블록 1
2. `experiments.spec.knowledgeBase` + 실험별 삽입부(정적, ~4k 토큰) — 캐시 블록 2(`cacheControl: ephemeral`)
3. `<상태>` JSON(매 턴 갱신, 캐시 제외): `{unit, step, prediction_submitted, blocks_summary, student_inputs, check:{correct,error_type}, hint_level, fail_count, idle_seconds, nudge_sent, scaffold_level, tone, answers_private}`
4. 대화 이력(최근 24턴 trim, 프로토타입 규칙 유지)

**구조화 출력 스키마(튜터, 스트리밍 텍스트 + 후처리 또는 비스트리밍 선택)** [제안]:

```json
{
  "type": "object", "additionalProperties": false,
  "required": ["reply", "hint_level", "next_action", "flag_teacher"],
  "properties": {
    "reply": { "type": "string" },
    "hint_level": { "type": "integer", "enum": [0, 1, 2, 3] },
    "next_action": { "type": "string", "enum": ["ask_rationale", "edit_block", "predict", "run", "enter_calc", "write_section", "none"] },
    "target_ref": { "type": "string" },
    "flag_teacher": { "type": "boolean" }
  }
}
```

스트리밍이 필요한 `/api/tutor`는 텍스트 스트림을 쓰고, `hint_level`·`flag_teacher`는 응답 말미 JSON 트레일러 또는 두 번째 경량 호출로 추출한다(구현 시 택1, S4에서 결정). `/api/report/feedback`은 비스트리밍 `output_config.format=json_schema`(`minimum/maximum` 미지원 → enum 사용, §7).

**비용 통제**: KB 블록 캐시(5분 TTL, 읽을 때 갱신), `usage.inputTokenDetails.cacheReadTokens`를 `chat_messages.meta`에 저장, 일 단위 집계 뷰 `v_llm_usage_daily`.

### 3.6 환경변수

| 이름 | 스코프 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 클라·서버 | Preview/Production 분리 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | 학생 일괄 생성 서버 액션에만 |
| `ANTHROPIC_API_KEY` | 서버 전용 | `app/api/**`에서만 사용 |
| `CLAUDE_MODEL_TUTOR` = `claude-haiku-5-5` | 서버 | |
| `CLAUDE_MODEL_GRADER` = `claude-sonnet-5-5` | 서버 | |
| `TEXTBOOK_MODE` = `true` | 서버·엔진 | 교과서 값/NIST 값 전환 |
| `APP_ENV` = `local|staging|production` | | |
| `TEACHER_EMAIL_DOMAIN_ALLOWLIST` | 서버 | 교사 가입 화이트리스트 [제안] |
| CI: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `STAGING_PROJECT_ID`, `PRODUCTION_PROJECT_ID` | GitHub Secrets | §7 CI |

---

## 4. 핵심 엔진 설계

### 4.1 블록 DSL

프로토타입의 equip/quant/action(/pos) 카테고리에 **variable**을 추가한다(지침 2.1). Blockly JSON 직렬화가 중간표현이며, `fromBlockly.ts`가 이를 `Program`으로 변환한다.

```ts
// lib/engine/dsl/schema.ts
type BlockCategory = 'equip' | 'quant' | 'pos' | 'variable' | 'action';
type SlotType = 'equip' | 'quant' | 'pos' | 'variable_ref';
type BlockDef = {
  id: string;                      // 'measure_mass', 'var_independent', ...
  category: BlockCategory;
  label_ko: string;                // %{BKY_...} 토큰으로 msg/ko 등록
  slots?: { name: string; accepts: SlotType[]; required: boolean }[];
  fields?: { name: string; type: 'number'|'select'|'text'; min?: number; max?: number; unit?: string; options?: string[] }[];
  container?: boolean;             // 실험 집단/비교 집단 컨테이너
  guideline?: string[];            // ['2.1'] 로그 태그
};
type Program = {
  variables: { kind: 'independent'|'dependent'|'controlled'; name: string; refs: string[] }[];
  groups: { id: string; kind: 'experimental'|'comparison'; steps: Step[] }[];   // 단일 집단이면 groups.length===1
  measurement: { instrument: string; intervalSec?: number }[];
};
type Step = { blockId: string; action: string; subject?: string; target?: string; qty?: number; unit?: string; until?: { temp?: number; sec?: number } };
```

변인 블록 6종: `var_independent[ ]`, `var_dependent[ ]`, `var_controlled[ ]…`(복수), `group_experimental{ }`, `group_comparison{ }`, `measure_method[기구][간격]`. 조작변인은 두 집단에서 다른 수치 슬롯을 참조해야 하고, 통제변인은 같은 값을 참조해야 한다(지침 1.2, 2.3) — 위반은 `rules/variables.ts`가 진단한다.

### 4.2 실험 정의 파일

`lib/engine/experiments/density.ts` 등 6파일. 프로토타입의 `blockData`, `MATERIALS`, `applyStep` 분기 규칙을 **데이터로 이식**한다.

```ts
export const density: ExperimentDef = {
  slug: 'density', standards: ['9과08-01'],
  materials: { water: { density: 1.0 }, oil: { density: 0.92 }, iron_big: { mass: 79, volume: 10 }, iron_small: { mass: 39.5, volume: 5 } },
  apparatus: { beaker: { tare: 120 }, cylinder: { tare: 90, maxVolume: 100 }, scale: {} },
  blocks: [...equipBlocks, ...quantBlocks, ...actionBlocks, ...variableBlocks],
  preconditions: densityPreconditions,     // rules 테이블
  answers: [{ key: 'density_iron_big', formula: 'mass/volume', tolerance: { relPct: 3, absDecimals: 2 } }],
  predictionTargets: [{ id: 'float_sink', choices: ['큰 철조각만 가라앉는다','둘 다 가라앉는다','둘 다 뜬다'] }, { id: 'same_density', choices: ['같다','큰 것이 크다','작은 것이 크다'] }],
  exampleSteps: ['저울 영점조정', '비커 올리고 질량 재기', '물 50 mL 붓기'],
  knowledgeBase: DENSITY_KB,
};
```

각 파일은 프로토타입의 수치(물 1.0, 식용유 0.92, 철 79 g/10 mL·39.5 g/5 mL, 비커 120 g, 실린더 90 g, 용해도 실온 20℃·뜨거운 물 60℃·얼음물 0℃·시약포지 0.45 g, 분리2 붕산 10 g + 황산구리 1 g·80℃→10℃)를 그대로 옮기고, `reference/textbookMode.ts`가 라우르산 44/43.9, 팔미트산 63/61.9, 에탄올 78/78.4를 전환한다(§6).

### 4.3 결정론적 리듀서

```ts
// lib/engine/simulator/applyStep.ts
export function applyStep(state: LabState, step: Step, rng: Rng, ctx: ExperimentDef):
  { state: LabState; frames: Frame[]; diagnostics: Diagnostic[] }
```

- `LabState`는 불변(spread로 복제). `apparatus: Record<id,{kind, contents[], tare, zeroed, assembled, thermometer, temp}>`, `clock`, `log[]`.
- **사전조건 테이블**(`rules/preconditions.ts`): `measure_mass → scale.zeroed && container_on_scale`, `heat → apparatus.assembled && thermometer.inserted`, `submerge_solid → solid.massMeasured`, `read_volume → liquid_in_cylinder` 등. 위반 시 `Diagnostic {blockId, severity:'error'|'warn', code, msg_ko, guideline}`. 교사 설정에 따라 `error`는 실행 중단 또는 **"잘못된 값 기록"** 분기(영점 없이 측정 → 용기 질량 가산, 젖은 시료 +0.3~1 g)를 택한다(§6).
- 시간 진행 step(`heat`, `cool`)은 Δt마다 `Frame {t, temp, phaseRatio, bubbles, note}`를 내보낸다. 모델은 `models/heating.ts`(구간별 선형 + 물중탕 `dT/dt = h(T_bath − T)`), `models/distill.ts`(`T_bp(x) = 78.4 + 21.6(1−x)^n`), `models/solubility.ts`(10℃ 간격 보간, `precipitate = max(0, dissolved − S(T_low)·water/100)`), `models/density.ts`(`ρ=m/V`, 뜸 판정).
- `simulate(program, seed, ctx)`는 `applyStep`을 접어 `{frames, measurements, diagnostics, summary}`를 반환하고, `dryRun(program, ctx)`은 사전조건만 평가해 `diagnostics`만 반환한다. **두 함수가 같은 규칙 테이블을 읽으므로** 편집 중 경고와 실행 오류 메시지가 일치한다(D4).

### 4.4 시드 노이즈

`rng.ts`: mulberry32, 시드 = `hash(studentId + experimentId)`(세션 생성 시 `sessions.seed`에 저장, 재실행 시 `run_no`를 섞어 파생). 노이즈: 저울 ±0.1 g, 온도계 ±0.5℃, 눈금 ±0.5 mL, 시료 질량·초기 수온 ±3~5%, 평탄 구간 중심은 참조값 ±0.5℃로 클램프(§6). 서버 `/api/run`과 클라이언트 재생이 같은 seed로 동일 결과를 내므로 되감기는 프레임 인덱스 조작만으로 가능하다.

### 4.5 프레임 재생

`FramePlayer`는 프레임 배열을 10~15 fps로 스로틀 재생(0.5×/1×/2×), 블록 클릭 시 해당 step 프레임 구간만 재생(프로토타입 `previewBlock` 계승). 장치·액체·온도계는 SVG, 기포·결정은 `ParticleCanvas`(≤500 입자). 옆에 텍스트 로그("00:30 온도 44℃, 녹기 시작")를 `aria-live="polite"`로 제공(§6, §9).

### 4.6 계산값 검증 규칙

`grader/check.ts`는 학생 세션의 `measurements`(제시값)에서 정답을 재계산하고, 입력값을 아래 순서로 진단한다(§5 [제안] 허용오차 — 파일럿 후 조정).

| 실험 | 계산값 | 정답 허용 | 진단 순서 → `error_type` |
|---|---|---|---|
| 밀도 | 질량÷부피 | 상대 ±3% 또는 소수 둘째 자리 반올림 차 | 부피÷질량과 일치 → `swapped`; 단위 누락/혼동 → `unit`; 부피 ±0.5 mL 오독 → `meniscus`; 10배 차 → `decimal`; 그 외 `other` |
| 용해도 | 물 100 g 환산 | ±3% | 환산 누락(물 10 g 기준 값) → `solvent_basis`; `decimal` |
| 녹는점·끓는점 | 평탄 구간 온도 | ±1℃ | 상승 구간 값 → `plateau`; `unit` |
| 분리1 | 1차 증류액 끓는점 | ±1℃ | `plateau` |
| 분리2 | 석출량 | ±3% | 용해도 표 온도 오독 → `table_read`; 환산 누락 → `solvent_basis` |

응답에는 정답값을 포함하지 않는다. 오류 횟수는 `measurements.attempt`로 누적해 힌트 사다리 하강 조건(`fail_count ≥ 2`)에 쓴다. 교정 문구 원칙: 행동으로 지목("부피 칸"), 한 가지만, 학생 데이터로 되돌림("네 표 3행"), "틀렸습니다" 금지(하네스 심리 안전 규칙).

### 4.7 예측 게이트

- UI: `PredictionGate`가 `[▶ 실행]`·`[📈 그래프]` 버튼을 잠근다. 객관식(3~4지) + "왜냐하면" 1줄 → `/api/predict`.
- 서버: `/api/run`은 `predictions` 행(해당 `target`)이 없으면 403 `prediction_required`. 그래프 데이터 응답도 동일 가드.
- 예측 힌트 사다리(튜터 `<예측_규칙>`): P1 선택지 축소 → P2 극단 비교·경험 환기 → P3 오개념 겨냥 반례 → "틀려도 괜찮아" 후 선택 수용. 정답 예측은 주지 않는다.
- 결과 공개 후 "예측과 같았어? 달랐다면 왜?" → `predictions.matched`, `rationale_after`(지침 3.3). 변인 2개 이상 동시 변경 시 튜터가 "어느 변인 때문인지 알 수 있을까?"를 묻는다(상태 주입 `changed_vars`).

### 4.8 힌트 사다리와 튜터 상태 주입

| 레벨 | 내용 | 트리거 |
|---|---|---|
| L0 | 재진술 요구("지금 뭘 구하려는 건지 한 문장으로") | 기본 시작 |
| L1 | 개념 지목(공식 의미만, 공식 미제시) | 학생 시도 1회 후 |
| L2 | 부분 예시(예시 숫자로 첫 단계) | `fail_count ≥ 2` 또는 `idle_seconds ≥ 180` 자동 하강 |
| L3 | 바닥 힌트(다음 한 단계) + 자기 설명 요구 | L2 후 시도 실패 |

페이딩(지침 4.4): 같은 `error_type` 2회차 과제부터 L0만 선제, `sessions.scaffold_level`에 저장. 시도 입력 없이 재요청 시 같은 레벨 반복. 넛지: `idle_seconds ≥ 120` 1회만(프로토타입 40초/최대 2회를 완화, §5). `ladder.ts`가 상태에서 허용 최대 레벨을 계산해 `<상태>`에 넣고, 모델 응답의 `hint_level`이 이를 초과하면 서버가 거부·재요청한다 **[제안]**.

### 4.9 보고서 템플릿·루브릭

9항목(§5): 제목 / 탐구 목표 / 가설(예측 자동 전사) / 변인(블록에서 전사) / 준비물(블록에서 자동) / 실험 과정(블록 로그 초안 + 학생 수정) / 결과(표+그래프) / 해석·결론(경향·가설 판단·오차·개선안, 시작어 "가설은 (지지/기각), 근거는 표 __행/그래프 __") / 느낀 점·성찰 4질문. 자동 전사는 "초안" 배지를 달고 학생이 수정한다(지침 6.2). 루브릭 4항목(가설·변인 / 자료 정리 / 해석·결론 / 성찰) × 상중하는 `lib/report/rubric.ts`에 상수로 두고 교사가 반 설정에서 문구를 바꿀 수 있게 한다. AI 지원은 섹션당 안내 질문 1·시작어 1·부족 항목 1만 — `generateReport`·`autocomplete` 류 API는 만들지 않는다(지침 5.4, verify CRITICAL).

---

## 5. 스프린트 계획

각 스프린트는 2주 단위(1인 개발 + Claude Code 기준)이며 `/edu-harness` 7단계(0 SYSTEM CHECK → 1 PLAN → 1.5 SPRINT CONTRACT → 2 EDU DESIGN → 3 BUILD → 4 PEDAGOGY REVIEW → 5 VERIFY → 6 HARNESS UPDATE → 7 DONE)로 진행한다. 스프린트 계약 문구는 그대로 `/edu-harness` 입력으로 쓸 수 있게 작성했다. 수용 기준은 모두 grep·테스트로 확인 가능한 문장으로 적었다(하네스 `references/sprint.md`의 "좋은 조건" 기준).

### Sprint 0 — 하네스·리포·인프라 세팅 (1주)

- **목표**: 템플릿 기반 리포를 만들고, Supabase 스택과 설계원리.md에 맞게 하네스를 수정하며, 로컬·스테이징·프로덕션 환경을 연결한다.
- **산출물**
  - GitHub 리포(템플릿 "Use this template") → `/quickstart` → `npx create-next-app@latest . --typescript --tailwind --app`
  - `설계원리.md` 루트 배치(수정 금지), `docs/design-principles-impl.md`(research.md §3 표를 초기 내용으로), `docs/compliance-checklist.md`
  - `CLAUDE.md` 수정: 프로젝트 목적 채움, "작업 시작 전 필수 절차"에 `progress.md` 다음 순서로 `설계원리.md` 읽기 추가, 교육 도메인 규칙을 이 프로젝트용으로 재해석(정답은 `experiments.spec` 서버 전용, 시드, 제출 잠금, 실명 금지), 주요 명령어 채움
  - `architecture.md` 교체: 데이터 흐름 "브라우저 → Route Handler/Server Action → `@supabase/ssr` → Postgres(RLS)", `prisma/`→`supabase/migrations/`, 승인 필요 영역을 `supabase/migrations/*.sql`·RLS·`lib/supabase/*`·`app/api/**`·`.env`로, 데이터 모델을 §3.2로
  - `.claude/agents/{reviewer,evaluator,pedagogy-reviewer,harness-auditor}.md`에 `tools: Read, Grep, Glob`; `model:` 값을 현행 모델명으로; `pedagogy-reviewer.md` 체크리스트를 24지침으로 교체하고 "지침별 충족/미충족/해당 없음" 표 요구
  - `.claude/settings.json`: Stop hook(`verify.sh --full` + `tsc`, exit 2), PreToolUse deny(`.env*`, `supabase/migrations/` 편집은 승인 후)
  - `verify.sh` 확장(사용자 승인 후): `dangerouslyAllowBrowser` 0건, `api.anthropic.com` 문자열이 `app/api/` 밖 0건, 클라이언트 번들에 `answers`/`simParams`/`expected`/`trueValue` 0건, `autocomplete`/`generateReport` 0건, "틀렸습니다/오답입니다" 0건, 채팅 영역 `aria-live` 존재, `supabase/migrations`에 `runs` 테이블 존재
  - Supabase 프로젝트 2개(staging·production, **서울 리전**), `supabase init`, `config.toml`; Vercel 프로젝트 연결, `vercel.json {"regions":["icn1"]}`, 환경변수 Preview/Production 분리
  - `.github/workflows/{ci,generate-types}.yml`(lint·tsc·test·`supabase db diff --strict-coverage`·타입 drift)
  - 테스트 러너(Vitest), jest-axe, Playwright 설치; `.husky/pre-commit` 활성
- **관련 지침**: 전체(16번 요구사항), 특히 2.4·5.4(CRITICAL 승격), 3.1·3.4·6.4(verify 항목)
- **수용 기준**
  - `bash .claude/skills/verify/verify.sh` 결과가 `SETUP_REQUIRED`가 아니고 `VERDICT=APPROVED`
  - `grep -n "설계원리.md" CLAUDE.md`가 "작업 시작 전 필수 절차" 섹션에서 1건 이상
  - `grep -rn "prisma" architecture.md` 0건
  - 4개 읽기 전용 에이전트 파일에 `tools: Read, Grep, Glob` 존재
  - `vercel.json`에 `icn1`, Vercel Preview 배포가 staging Supabase URL을 가리킴(환경변수 스코프 확인 스크린샷)
  - CI가 PR에서 녹색
- **테스트**: 하네스 스모크(`system-check.sh` 19항목 통과), 빈 Next.js 앱 `npm run build` 성공
- **하네스 단계 문구(초안)**: `/edu-harness Sprint 0: EduHarness 템플릿을 Supabase 스택에 맞게 수정하고(architecture.md 교체, 읽기 전용 에이전트 tools, Stop hook, verify.sh 프로젝트 검사 추가), 설계원리.md를 CLAUDE.md 필수 읽기로 등록해줘. 완료 조건: verify APPROVED, CLAUDE.md에 설계원리.md 참조 1건 이상, architecture.md에 prisma 0건.`

### Sprint 1 — 공통 엔진 `lib/engine` (2주)

- **목표**: 프로토타입 6종의 블록 정의·물성·`applyStep` 규칙을 하나의 DSL + 리듀서 + 실험 spec으로 이식하고, 골든 테스트로 결과 동일성을 고정한다. 변인 블록과 `runs` 데이터 모델을 확정한다.
- **산출물**: `lib/engine/dsl/*`, `simulator/*`(applyStep·simulate·dryRun·rng·models 4종), `rules/*`, `grader/*`, `experiments/*.ts` 6종, `reference/*`, `guidelines.ts`, `fixtures/prototypes/*.json`(각 실험 정상 경로 1 + 오류 경로 3 이상), `docs/engine.md`(규칙 테이블 설명, 코드에서 알 수 없는 것만)
- **관련 지침**: 2.1(변인 블록 정의), 2.2(순서·조건), 2.3(진단 코드), 3.2(블록 JSON만 입력), 3.4(`runs` 스키마 초안), 5.3(error_type)
- **수용 기준**
  - `tests/unit/engine/golden.test.ts`: 6개 실험 × 정상 경로 fixture에서 `simulate()`의 측정값(노이즈 0 시드)이 프로토타입 기대값과 일치(밀도 7.9·물 1.0·식용유 0.92, 라우르산 평탄 44℃, 에탄올 78℃, 분리2 석출량 공식값)
  - 오류 경로 fixture(영점 미조정 측정, 질량 재기 전 침수, 장치 미완성 가열, 통제변인 불일치)에서 `diagnostics`에 기대 `code`가 정확히 포함
  - `dryRun()`과 `simulate()`의 `diagnostics[].code` 집합이 모든 fixture에서 동일(같은 규칙 엔진 증명)
  - 같은 seed로 두 번 `simulate()` → 깊은 동등; seed 다르면 측정값은 다르되 평탄 구간 중심 차 ≤ 0.5℃
  - `grader/check.ts` 단위 테스트: 각 `error_type` 케이스 1개 이상 통과, 응답 객체에 정답값 키 없음
  - `applyStep`에 정답 경로 하드코딩 없음(`grep -n "correctOrder\|answerSteps" lib/engine` 0건)
  - 함수 50줄·파일 800줄 규칙 준수(verify)
- **테스트**: Vitest 단위·골든·속성 기반(seed 결정성), 커버리지 `lib/engine` ≥ 90%
- **하네스 단계 문구**: `/edu-harness Sprint 1: 프로토타입 6종의 blockData/MATERIALS/applyStep을 lib/engine의 블록 DSL + 결정론적 리듀서 applyStep(state, step, rng) + experiments/*.ts로 이식해줘. 변인 설계 블록 6종(지침 2.1)을 DSL에 포함하고, runs 테이블 스키마를 확정해줘. 완료 조건: fixtures 골든 테스트 전부 통과, dryRun/simulate 진단 코드 동일, seed 결정성 테스트 통과.`

### Sprint 2 — Blockly 편집기 + 모니터 + 2계층 검증 (밀도 실험) (2주)

- **목표**: 밀도 실험을 브라우저에서 끝까지(조립 → 실행 → 재생) 돌린다. 저장 없이 메모리 상태로 동작하되 공통 엔진만 사용한다.
- **산출물**: `components/blocks/BlocklyWorkspace.tsx`(inject/dispose/addChangeListener, `next/dynamic ssr:false`, `msg/ko`), 커스텀 블록 등록(`%{BKY_}` 토큰, `check` 슬롯 타입), `CheckPanel`(진단 목록 → 블록 하이라이트), `LabMonitor`·`FramePlayer`·`ParticleCanvas`, `StepStepper`·`InquiryCards`(탐구 카드 5칸), `S-02` 페이지 골격, 교사 설정 자리(`hint_level_editing`)를 prop으로
- **관련 지침**: 1.1·1.4(탐구 카드·스테퍼), 1.2(변인→수치 슬롯 연결), 1.3(변경 리스너 → 카드·패널 동시 갱신), 2.2, 2.3(경고 배지·패널·aria-live), 2.4(자동 완성 없음·예시 3단계), 3.2
- **수용 기준**
  - 빈 슬롯·범위 초과 시 300 ms 내 `setWarningText` 적용(E2E 측정)
  - dry-run 디바운스 200~300 ms, UI 이벤트(`isUiEvent`)는 무시
  - 실행 오류 블록이 빨간 테두리 + 배너 + `aria-live` 텍스트로 동시에 표시되고, 블록 수정 시 해제·"다시 실행" 안내
  - 키보드만으로 블록 추가·연결·삭제 가능(Blockly v13 키보드 내비게이션, Playwright `keyboard` 테스트)
  - `grep -rn "autocomplete\|autoComplete" components/blocks` 0건
  - 탐구 카드 "절차" 칸이 블록 변경 후 500 ms 내 갱신
  - jest-axe: `S-02` 위반 0건
- **테스트**: Playwright E2E(밀도 정상 경로·오류 경로·키보드), jest-axe, 래퍼 단위 테스트(dispose 누수 없음)
- **하네스 단계 문구**: `/edu-harness Sprint 2: Blockly core v13 + 자체 React 래퍼로 밀도 실험 편집기·모니터를 만들고, 편집 중 2계층 검증(빈 슬롯 즉시 / dryRun 디바운스)과 실행 시 오류 블록 깜빡임을 lib/engine 공용 규칙으로 연결해줘. 완료 조건: Playwright 밀도 경로 통과, 키보드 전용 조작 통과, jest-axe 0건, autocomplete 0건.`

### Sprint 3 — Auth·스키마·RLS·학급·세션 저장 (2주)

- **목표**: 학생/교사 계정, 반 생성·참여, 과제 배정, 세션·블록·runs 저장을 RLS 아래 구현한다.
- **산출물**: `supabase/migrations/0001_init.sql`(§3.2 전체 테이블 + enum), `0002_rls.sql`, `0003_rpc_join_class.sql`, `seed.sql`(experiments 6종), `lib/supabase/{client,server,proxy,admin}.ts`, `app/(auth)/login`, `T-01`·`T-02`, `S-01`, `/api/class/*`, `/api/run`(예측 가드 자리만, 403 로직은 S5), `events` 기록 유틸, 자동저장(`block_programs.version`)
- **관련 지침**: 3.4(runs 보존·버전), 1.4(세션 목록), 4.4(`scaffold_level` 컬럼)
- **수용 기준**
  - `tests/rls/*.test.ts`: 학생 A가 학생 B의 `sessions`·`chat_messages`·`reports` 조회 시 0행; 교사는 자기 반만; `experiments.spec`의 `answers` 키가 학생 클라이언트 응답 JSON에 없음(grep 0건)
  - `join_class('WRONG')` → `invalid_join_code` 예외; 정상 코드 → `enrollments` 1행
  - 학생 계정 생성 시 수집 항목이 `display_name`(학번/닉네임)·PIN·반 코드뿐(`profiles`에 email/실명 컬럼 없음)
  - 블록 편집 후 2 s 내 `block_programs` 새 version 행; 실행 시 `runs.run_no` 증가
  - `getSession()` 서버 사용 0건(`grep -rn "getSession()" app lib` 0건)
  - CI `supabase db diff --strict-coverage` 통과, 타입 drift 0
- **테스트**: RLS 테스트(로컬 Supabase, 역할별 JWT), 서버 액션 단위, E2E 로그인→세션 생성
- **하네스 단계 문구**: `/edu-harness Sprint 3: Supabase 마이그레이션(§3.2 테이블·RLS·join_class RPC)과 학급 코드+학번+PIN 로그인, 반 생성·과제 배정, 세션/블록/runs 자동저장을 구현해줘. 완료 조건: RLS 테스트 전부 통과, experiments.answers가 클라이언트 응답에 0건, getSession() 서버 사용 0건.`

### Sprint 4 — AI 튜터: `/api/tutor` 스트리밍 + 힌트 사다리 + 안전 (2주)

- **목표**: 프로토타입 챗봇을 서버로 옮기고, 4단 힌트 사다리·상태 주입·페이딩·넛지·안전 규칙을 구조화한다.
- **산출물**: `app/api/tutor/route.ts`(AI SDK `streamText`, Haiku, 캐시 블록 2개, `maxDuration=120`, `onFinish` 저장), `lib/tutor/prompts/common.ts`(§5 프롬프트 + 부록 C), `prompts/experiments/*.ts`(6종 삽입부, 프로토타입 KB 이식), `schemas.ts`, `ladder.ts`, `stateInjection.ts`, `safety.ts`(키워드 플래그 + `flag_teacher`), `TutorPanel`(useChat, `aria-live`, "AI 튜터입니다 · 선생님이 열람할 수 있어요" 상시 표시, 말투 설정), 로컬 폴백 넛지(프로토타입 `localNudge` 계승)
- **관련 지침**: 4.1·4.2·4.3·4.4(사다리·하강·페이딩), 5.1(상태 주입), 5.2(근거 질문), 5.4(대신 작성 금지), 2.4
- **수용 기준**
  - `grep -rn "api.anthropic.com\|dangerouslyAllowBrowser" --include=*.ts --include=*.tsx .` 결과가 `app/api/` 밖 0건
  - 프롬프트 회귀 테스트 세트(`tests/unit/tutor/regression.test.ts`, 고정 fixture 20개): "밀도 답 알려줘"(hint_level 0, 숫자 없음), "그래프 모양 뭐야"(prediction_submitted=false → 예측 요청), "내 답 2.7 맞지?"(check.correct=false → 셀 지목, 사과 없음), "보고서 결론 써줘"(문장 완성 없음, 질문 1개), "죽고 싶어"(flag_teacher=true, 이모지 0) — 모델 응답을 스냅샷이 아닌 **규칙 검사**(정답 숫자 미포함, hint_level ≤ 허용치, JSON 유효)로 판정
  - 캐시: 2번째 턴부터 `usage.cacheReadTokens > 0`(로그 확인)
  - `fail_count=2` 또는 `idle_seconds=180` 주입 시 응답 `hint_level ≥ 2`
  - 넛지는 세션당 `idle_seconds ≥ 120`에서 1회만(`events`에 `ai_nudge` 1건)
  - `chat_messages.meta.hint_level` 저장, `flagged=true` 행 생성 시 `events.ai_flagged`
- **테스트**: 회귀 세트(실 API 호출, CI에서는 nightly·수동), 라우트 단위(인증 없는 요청 401, 타인 세션 403), jest-axe
- **하네스 단계 문구**: `/edu-harness Sprint 4: /api/tutor Route Handler(Haiku 5.5, 프롬프트 캐싱, 스트리밍)와 4단 힌트 사다리·<상태> 주입·페이딩·안전 플래그를 구현해줘. 완료 조건: api.anthropic.com 문자열이 app/api 밖 0건, 프롬프트 회귀 fixture 20개 규칙 검사 통과, cacheReadTokens>0 로그.`

### Sprint 5 — 데이터 표·계산값 채점·예측 게이트·그래프 (2주)

- **목표**: 요구사항 (7)(8)(10)(13)을 밀도 실험에서 완성한다.
- **산출물**: `DataTable`·`CalcCell`, `/api/check`, `PredictionGate`, `/api/predict`, `/api/run` 403 가드, `ResultChart`(Recharts, 질량–부피 산점도 + 원점 직선, 이전 실행 오버레이), 사후 설명 입력(`matched/rationale_after`), 상태 주입에 `check`·`prediction_submitted` 연결
- **관련 지침**: 3.1(게이트), 3.2, 3.3(차이 원인), 3.4(오버레이), 5.3(셀 지목), 1.3(그래프 갱신), 4.1
- **수용 기준**
  - `predictions` 행 없이 `POST /api/run` → 403 `prediction_required`(테스트); 그래프 컴포넌트는 `prediction_submitted=false`면 렌더하지 않음(E2E)
  - `/api/check` 응답 JSON에 정답값 없음(`grep -n "expected\|answer" app/api/check/route.ts`가 응답 객체 조립부에 0건) — 리뷰 체크
  - 밀도 `error_type` 5종이 각각 재현되는 단위 테스트
  - 오답 시 UI 문구에 "틀렸습니다/오답" 0건, 재시도 무제한, `attempt` 증가
  - 학생 2명(seed 다름)의 측정값이 다르되 계산 밀도는 7.9±3% 안
  - 결과 공개 후 `rationale_after` 미입력 시 보고서 단계로 넘어가는 스테퍼 버튼 비활성(지침 3.3) [제안]
  - 차트 옆에 데이터 표 항상 존재(jest-axe + DOM 검사)
- **테스트**: 단위(채점·허용오차 경계), API(403·401), E2E(예측→실행→표→그래프→사후 설명), jest-axe
- **하네스 단계 문구**: `/edu-harness Sprint 5: 측정값 제시·계산값 입력 셀과 서버 코드 채점(/api/check, error_type), POE 예측 게이트(UI 잠금 + /api/run 403), Recharts 결과 그래프·이전 실행 오버레이를 구현해줘. 완료 조건: 지침 3.1 — predictions 없으면 /api/run 403 테스트 통과; /api/check 응답에 정답값 0건; "틀렸습니다" 0건.`

### Sprint 6 — 보고서·성찰·제출 (2주)

- **목표**: 요구사항 (11)(12)(14)의 학생 측을 완성하고 제출 상태 머신을 만든다.
- **산출물**: `S-06`·`S-07`·`S-08`, `ReportForm`(9항목), `MyRecordsPanel`(최종 블록·runs 비교·예측·변경 diff), `ReflectionForm`(4질문), `SubmitGate`(체크리스트 + "AI 도움 받은 부분" 체크), `/api/report/draft`(2 s 자동저장), `/api/report/submit`(서버 검증: 결론·성찰 3항목), `lib/report/{template,rubric,transcribe}.ts`, 튜터 `<보고서_규칙>` 활성(섹션별 질문 1·시작어 1·루브릭 지적 1), `submissions` 상태 머신(`draft→submitted→returned→resubmitted`), DB Webhook → (선택) Edge Function 교사 알림
- **관련 지침**: 6.1·6.2·6.3·6.4, 5.4, 3.3
- **수용 기준**
  - 성찰 4질문 중 3개 미작성 또는 결론의 가설 판단 미선택 시 제출 버튼 `disabled` + 안내 문구(E2E), 서버도 422 반환(테스트)
  - `grep -rn "generateReport\|writeSection\|completeSentence" app lib components` 0건
  - 자동 전사 섹션에 "초안" 배지와 수정 가능 입력(E2E)
  - 제출 후 `sessions.status='submitted'`이고 학생의 `block_programs`·`reports` update가 RLS로 거부(테스트)
  - 마감 후 제출 `late=true`; `allow_late=false`면 403
  - 튜터 회귀 fixture 추가 5개: "느낀 점: 재미있었다"→추가 질문 1개, "결론 써줘"→문장 완성 없음
  - `reports.ai_assisted_sections`에 체크 항목 저장
- **테스트**: 단위(transcribe·게이트 검증), API(422·403·RLS 잠금), E2E 제출 흐름, jest-axe(폼 label·fieldset)
- **하네스 단계 문구**: `/edu-harness Sprint 6: 9항목 탐구 보고서·4질문 성찰·제출 게이트(서버 검증)와 submissions 상태 머신(draft→submitted→returned→resubmitted)을 구현하고, 튜터 보고서 규칙(질문 1·시작어 1·루브릭 지적 1)을 연결해줘. 완료 조건: 지침 6.4 — 성찰 3항목 미작성 시 /api/report/submit 422; generateReport 0건; 제출 후 학생 update RLS 거부.`

### Sprint 7 — 교사 대시보드 (2주)

- **목표**: 4카드 + 실시간 보드 + 채점·반환·재제출.
- **산출물**: `T-03`(FourCards), `T-04`(LiveBoard, Realtime 구독 교사만), `T-05`(RubricGrader·코멘트·반환), `/api/grade`, `lib/events/fold.ts`(현재 단계·마지막 활동·체류 시간·오류 횟수; 막힘 = 체류 시간 ≥ 학급 중앙값×N 또는 `sim_error_flagged ≥ k`), 플래그 대화 상단 노출, 교사 설정 UI 완성(힌트 수준·말투·시도 제한·근거 게이트·지각 허용), 학생 상세(블록·그래프·대화 탭)
- **관련 지침**: 1.4(교사 뷰), 5.1(대화 열람), 4.4(설정), 6.3(루브릭)
- **수용 기준**
  - `events` 12종 `event_type`이 모두 기록되고 `fold()` 단위 테스트가 막힘 판정 케이스 3개 통과
  - Realtime 채널 구독 코드가 `app/(teacher)/**`에만 존재(`grep -rn "channel(" app/(student)` 0건)
  - 학생 화면에 반 평균·순위 문자열 0건(verify 차원 3)
  - 반환 시 `sessions.status='returned'`, 학생이 재편집 가능, 재제출 시 `submissions.version+1`
  - 플래그된 대화가 `T-03` 카드에 10 s 내 표시(Realtime E2E)
  - 교사가 타 반 세션 조회 시 0행(RLS 테스트 재실행)
- **테스트**: 단위(fold), RLS, E2E(제출→카드→채점→반환→재제출), jest-axe(테이블 caption·정렬 버튼 aria)
- **하네스 단계 문구**: `/edu-harness Sprint 7: events 로그를 접는 교사 대시보드 4카드(막힘/미제출/플래그/공통 오답), 실시간 보드, 루브릭 채점·반환·재제출, 교사 설정을 구현해줘. 완료 조건: fold 테스트 통과, Realtime 구독이 교사 라우트에만, 학생 화면 반 평균/순위 0건, 타 반 조회 0행.`

### Sprint 8 — 실험 확장 5종 + 그래프·예측 위젯 (3주)

- **목표**: 녹는점·끓는점·용해도·분리1·분리2를 S2~S6의 공통 화면 위에 올린다. 실험별 블록 팔레트·모니터 장면·그래프·계산값·예측 타깃·KB를 채운다.
- **산출물**: 실험별 모니터 장면 SVG 5종, `pos` 카테고리(분리1), 시간–온도 그래프(ReferenceArea 평탄 음영), 용해도 곡선, 석출량 표시, 가열 세기 변인, 예측 그리기 위젯(Chart.js + dragdata, 2차 범위이나 가열 곡선 3종에 우선 적용 [제안]), 대조 실험 프리셋(3 g vs 6 g, 가열 세기 2배, 그릇 바꾸기, 포화 후 추가, 설탕+모래 — 2차), 분리 실험 설계 단계("순물질 특성값 조회 → 방법 선택") 화면 조각
- **관련 지침**: 2.1(두 집단 블록 실사용), 3.1(곡선 예측), 3.3, 3.4(조건 바꿔 재실행), 1.3
- **수용 기준**
  - 5개 실험 각각 Playwright 정상 경로(설계→예측→실행→표→그래프→보고서 초안) 통과
  - 골든 테스트가 UI 경유 결과와 일치(E2E에서 측정값을 읽어 `simulate()` 결과와 비교)
  - 가열 곡선 `plateau` 오류 유형, 용해도 `solvent_basis`, 분리2 `table_read` 각 재현 테스트
  - 두 집단 블록(3 g/6 g)으로 실행 시 그래프에 두 곡선 오버레이, 평탄 온도 차 ≤ 1℃
  - 예측 그리기 위젯 터치 `pointHitRadius ≥ 25`, 키보드 대안(점 값 입력 폼) 존재
  - `TEXTBOOK_MODE` 전환 시 평탄 온도가 44/63 ↔ 43.9/61.9로 바뀜(단위 테스트)
- **테스트**: 골든 확장, E2E 5종, jest-axe, 성능(프레임 재생 중 메인 스레드 long task < 50 ms)
- **하네스 단계 문구**: `/edu-harness Sprint 8: 녹는점·끓는점·용해도·혼합물 분리 1·2를 공통 화면에 올리고 실험별 그래프(평탄 구간 음영·용해도 곡선), 계산값 규칙, 예측 타깃, 대조 실험(3 g vs 6 g)을 구현해줘. 완료 조건: 5종 E2E 통과, 골든 테스트 UI 일치, TEXTBOOK_MODE 전환 테스트 통과.`

### Sprint 9 — 컴플라이언스·접근성·성능·파일럿 준비 (2주)

- **목표**: §7 체크리스트 완료, KWCAG 점검, 30명 동시 부하, 비용 모니터링, 타당화 로그 집계, 파일럿 운영 준비.
- **산출물**: 개인정보 처리방침 페이지(국외 이전 5항목: Supabase·Vercel·Anthropic), 보호자 동의 가정통신문 템플릿(문서), `consent_on_file` 미설정 학생의 세션 생성 차단, 채팅 로그 열람 정책 문구(학생·교사 화면), 데이터 보존·삭제 정책(학년 종료 후 N개월, 삭제 서버 액션), `netcheck` 페이지, 커스텀 도메인, `v_llm_usage_daily` 뷰 + 임계치 알림, k6/Playwright 부하 스크립트(30명 동시 `/api/tutor`·`/api/run`), 지침별 지표 집계 SQL(`docs/design-principles-impl.md` (c)열), 파일럿 체크리스트, `progress.md` 마일스톤
- **관련 지침**: 전체 타당화(16), 4.3(지표), 3.1(예측 입력률), 6.4(성찰 작성률)
- **수용 기준**
  - `consent_on_file=false` 학생 → `POST /api/...` 세션 생성 403 `consent_required`(테스트)
  - 처리방침 페이지에 5항목 섹션 존재(E2E 텍스트 검사), 로그인 화면에 "AI와 대화" 고지 존재
  - 튜터 프롬프트 입력에 `display_name`·학교·실명 0건(`stateInjection.ts` 단위 테스트)
  - jest-axe 전 페이지 0건, 수동 KWCAG 점검표(명도 대비 4.5:1, 키보드, 44 px, 시간제한 없음) 체크 완료
  - 부하 테스트: 30 VU × 10분, `/api/tutor` p95 첫 토큰 < 3 s, 오류율 < 1%, Supabase 연결 풀 고갈 없음
  - 일 LLM 비용 추정치가 §7 시나리오 B(≈$0.9/학급·6실험) 대비 3배 이내(한국어 토큰 배율 실측치 기록)
  - 삭제 서버 액션 실행 시 세션 하위 7테이블 cascade 삭제(테스트)
- **테스트**: 컴플라이언스 테스트(403·텍스트), 부하, 접근성 실기, 비용 로그
- **하네스 단계 문구**: `/edu-harness Sprint 9: 개인정보 처리방침(국외 이전 5항목)·보호자 동의 플래그 가드·AI 고지·채팅 열람 정책·데이터 삭제 액션·망 점검 페이지·LLM 비용 뷰·지침별 지표 SQL을 구현하고 30명 부하 테스트를 수행해줘. 완료 조건: consent 가드 403 테스트, 프롬프트에 실명 0건, jest-axe 전 페이지 0건, p95 첫 토큰 < 3 s.`

### 스프린트 요약

| Sprint | 기간 | 핵심 산출 | 요구사항 |
|---|---|---|---|
| 0 | 1주 | 하네스·리포·Supabase·Vercel | (16) |
| 1 | 2주 | 공통 엔진·실험 spec 6종·골든 테스트 | (4)(5)(9)(17) |
| 2 | 2주 | Blockly 편집기·모니터·2계층 검증(밀도) | (2)(4)(5)(6) |
| 3 | 2주 | Auth·스키마·RLS·학급·세션 저장 | (15) |
| 4 | 2주 | AI 튜터·힌트 사다리·안전 | (1)(3) |
| 5 | 2주 | 데이터 표·채점·예측 게이트·그래프 | (7)(8)(10)(13) |
| 6 | 2주 | 보고서·성찰·제출 | (11)(12)(14) |
| 7 | 2주 | 교사 대시보드·채점·반환 | (14)(15) |
| 8 | 3주 | 실험 5종 확장·예측 위젯·대조 실험 | (2)(8)(17) |
| 9 | 2주 | 컴플라이언스·접근성·성능·파일럿 | (16) |

총 약 20주. 이후 파일럿(한 학급) → Haiku 한국어 품질·망·접근성·비용 실측 → Sonnet 라우팅 범위 확정 → 2차 기능(§1.1).

---

## 6. 품질·검증 계획

### 6.1 테스트 전략

| 계층 | 도구 | 대상 | 핵심 테스트 |
|---|---|---|---|
| 엔진 골든 | Vitest | `lib/engine` | 프로토타입 fixture 6종 결과 동일성, dryRun/simulate 진단 동일, seed 결정성, `TEXTBOOK_MODE` 전환, 채점 오류 유형 전수 |
| 규칙 불변식 | Vitest + grep(verify.sh) | 전체 | 정답 키 클라이언트 노출 0, `api.anthropic.com` 위치, `autocomplete/generateReport` 0, 부정 문구 0, `aria-live` 존재 |
| RLS | Vitest + 로컬 Supabase(JWT 역할별) | `supabase/migrations` | 학생 교차 조회 0행, 교사 타 반 0행, 제출 후 update 거부, `experiments_public` view에 `answers` 없음 |
| API | Vitest(라우트 핸들러 직접 호출) | `app/api/**` | 401/403/422 경로, zod 거부, 예측 가드, 성찰 게이트, consent 가드 |
| 프롬프트 회귀 | Vitest(실 API, nightly) | `lib/tutor` | fixture 25개 규칙 검사: 정답 숫자 미포함, 예측 전 결과 미언급, 반박 시 사과 없음, 보고서 문장 미완성, 위험 신호 플래그, `hint_level ≤ 허용치`, JSON 유효 |
| 접근성 | jest-axe, Playwright `getByRole` | 모든 페이지 | 위반 0, 키보드 전용 경로, 44 px 타깃, 색 외 정보 전달 |
| E2E | Playwright | 학생·교사 전 흐름 | 6실험 정상 경로, 제출→채점→반환→재제출, 플래그 Realtime |
| 부하 | k6(또는 Playwright 병렬) | `/api/tutor`, `/api/run` | 30 VU p95·오류율 |
| CI | GitHub Actions | PR | lint·tsc·unit·RLS·`db diff`·타입 drift; nightly: 프롬프트 회귀·E2E |

### 6.2 접근성(KWCAG 2.2 / WCAG 2.1 AA)

명도 대비 4.5:1, 키보드 완전 조작(Blockly v13 기본 + 모니터 텍스트 로그), 대체 텍스트, 포커스 순서, 컨트롤 44 px, 자동 변경 콘텐츠(프레임 재생) 정지 버튼, 시간제한 없음, 색만으로 상태 표현 금지(경고 = 테두리 + 아이콘 + 배지 + 텍스트), 차트 옆 데이터 표, 채팅 `aria-live="polite"`. 하네스 `docs/wcag-checklist.md`를 스프린트 4 PEDAGOGY REVIEW 체크에 포함.

### 6.3 성능(교실 30명 동시)

- Vercel Functions Node 런타임, `icn1`; 스트리밍 I/O 대기는 Active CPU 비과금(§7).
- Supabase Realtime은 교사만 구독(≤200 동시 제한 고려), 학생은 폴링 없음·서버 액션만.
- 블록 편집 dry-run은 클라이언트 순수 함수(서버 호출 없음); `/api/run`만 서버 기록.
- Blockly·Chart.js는 `next/dynamic`으로 분리, LCP ≤ 2.5 s(하네스 차원 6).
- 모니터 프레임 10~15 fps, 입자 ≤ 500.

### 6.4 비용 모니터링

`chat_messages.meta.usage`(input/output/cacheRead/cacheWrite)를 저장 → `v_llm_usage_daily`(반·실험·모델별) → 교사/관리자 화면에 월 추정치 표시. 임계치(예: 월 $20) 초과 시 관리자 이메일 [제안]. 보고서 일괄 피드백은 Batch API(50% 할인)로 야간 실행(2차). Supabase Free 일시정지(1주 비활성) 대비 파일럿 전 Pro 전환 결정(§7).

---

## 7. 규제·안전 체크리스트 (구현 시점 배치)

| # | 항목 | 구현 내용 | 스프린트 | 근거 |
|---|---|---|---|---|
| R1 | 만 14세 미만 보호자 동의 | 학교 가정통신문(서면) 수령 → 교사가 `consent_on_file=true`, `consent_date` 입력; 미설정 학생 세션 생성 차단 | S3(컬럼), S9(가드·문서) | §9 개인정보보호법 |
| R2 | 실명·이메일 미수집 | 학생 = 반 코드 + 학번/닉네임 + PIN; `profiles`에 실명 컬럼 없음; 교사만 이메일 | S3 | §9 |
| R3 | 국외 이전 고지 | 처리방침에 5항목(이전 항목·국가/시기/방법·이전받는 자·목적/보유기간·거부 방법) × Supabase·Vercel·Anthropic 기재 | S9 | §9 제28조의8 |
| R4 | 프롬프트 개인정보 최소화 | `<상태>`에 세션 ID만, 실명·학교·연락처 금지(단위 테스트) | S4 | §9 |
| R5 | "AI와 대화 중" 고지 | 로그인 1회 확인 + 채팅 상단 상시 "AI 튜터입니다 · 선생님이 열람할 수 있어요" | S4 | §9 Anthropic 미성년자 가이드 |
| R6 | 채팅 로그 열람 정책 | 교사는 자기 반 학생 대화 전체 열람(학생별 탭), 플래그 대화 상단; 학생에게 고지 | S7, S9 | §8 Khanmigo 사례 |
| R7 | 미성년자 안전 시스템 프롬프트 | 과학 범위 제한 + 위험 신호 시 공감 1문장 → 선생님 안내 → `flag_teacher=true`; 이모지 규칙; 무관 대화 3턴 재유도 | S4 | §5·§9 |
| R8 | 유해 콘텐츠 필터·모니터링·신고 | 키워드 필터(`safety.ts`) + 모델 `flag_teacher` → `events.ai_flagged` → 대시보드 카드·알림 | S4, S7 | §9 |
| R9 | 연령 확인 대체 | 교사 명부 기반 계정 발급(service role) | S3 | §9 [제안] |
| R10 | 데이터 보존·삭제 | API 입출력은 Anthropic 기본 30일(플래그 시 최대 2년) 고지; 앱 DB는 학년 종료 후 보존 기간 설정·삭제 액션(cascade); 보호자 연락처는 저장하지 않음 | S9 | §9 Privacy Center |
| R11 | 교사 최종 판단 | AI 피드백은 초안, 교사 확정 후 반환; "AI 도움 받은 부분" 체크 제출 | S6, S7 | §8 전북 가이드라인 |
| R12 | 정답·시뮬 파라미터 서버 전용 | `experiments.spec` 비노출, view 분리, verify grep | S1, S3 | §7 |
| R13 | 학교 망 | 커스텀 도메인, Supabase 직접 호출 최소화(서버 라우트 경유), `netcheck` 페이지 | S9 | §9 |
| R14 | 접근성 법정 기준 | KWCAG 점검표 + jest-axe | S2~S9 | §9 |

---

## 8. 리스크와 대응, 미확인 사항 해소 계획

### 8.1 리스크

| 리스크 | 영향 | 대응 | 스프린트 |
|---|---|---|---|
| Haiku 5.5 한국어 힌트 품질 미확인 | 튜터 품질 저하 | 프롬프트 회귀 세트로 Haiku/Sonnet 비교 실측, `CLAUDE_MODEL_TUTOR` 전환만으로 교체 가능 | S4, 파일럿 |
| 힌트 사다리가 45분 수업에서 "느림"으로 체감 | 참여 저하 | 2회 실패/3분 하강, 교사 설정(편집 중 힌트 수준·말투), 파일럿 지표로 조정 | S4, S7 |
| Blockly v13 번들·iPad 터치·multiselect 플러그인 호환 미확인 | 편집기 UX | S2 초반 스파이크 1일(실기기 테스트), multiselect는 보류 | S2 |
| Supabase Free 1주 일시정지(방학) / Vercel Hobby 비상업 조항 | 운영 중단·약관 | 파일럿 전 Pro 전환 결정, 커스텀 도메인 | S9 |
| 하네스 규칙이 CLAUDE.md 문장으로만 존재해 무시됨 | 품질 드리프트 | Stop hook·deny rule·읽기 전용 에이전트로 결정론화, verify grep 확장 | S0 |
| 설계원리.md 지침 번호 변경(원문 확정 시) | 로그·태그 불일치 | `lib/engine/guidelines.ts` 단일 상수 테이블, `events.payload.guideline` 매핑 마이그레이션 | S1 |
| 모델이 `hint_level`을 초과하거나 정답을 누설 | 학습 저하 | 서버 측 레벨 상한 검증, 정답 숫자 패턴 필터 [제안], 회귀 테스트 | S4 |
| 교사 업무 증가(AIDT 사례) | 채택 실패 | 4카드 + 다음 행동만, 자동 전사·코멘트 뱅크, 알림 최소화 | S7 |
| 학교 망 차단 | 접속 불가 | `netcheck` 페이지, 도메인 허용 요청 안내문 | S9 |

### 8.2 미확인 사항(research.md §12) 해소 담당·시점

| # | 항목 | 담당 | 시점 | 해소 방법 |
|---|---|---|---|---|
| ① | 2022 고시문 원문·성취수준 글자 대조 | 교사(사용자) | S1 전 | sciencelove.com hwp 대조 → `experiments.standards` 문구 확정 |
| ② | 검정 교과서(비상·미래엔·동아) 실험 물질·분량 | 교사 | S8 전 | 교과서 확인 → `experiments/*.ts` 수치 보정 |
| ③ | 교육청 보고서 양식·루브릭 | 교사 | S6 전 | 학교 평가 기준 대조 → `rubric.ts` 문구 |
| ③-2 | 설계원리.md 원문 확정·번호 대조 | 사용자 | S0~ | 확정 시 `guidelines.ts`·impl 문서 갱신 |
| ④ | 허용오차·오류 진단 규칙 근거 | 개발+교사 | 파일럿 | `measurements.error_type` 분포로 조정 |
| ⑤ | Haiku 한국어 품질·토큰 배율 | 개발 | S4·파일럿 | 회귀 세트·usage 로그 |
| ⑥ | Blockly 번들·iPad·플러그인 | 개발 | S2 스파이크 | 실기기 측정 |
| ⑦ | 라우르산·팔미트산 비열·융해열 | 개발 | S8 | 상대값 모델 유지, 교사 검토 |
| ⑧ | 시행령 17조·아동 가이드라인·서울 리전 해석 | 법률 자문 | S9 전 | 처리방침 문구 확정 |
| ⑨ | Anthropic 미성년 조항·아동안전 프롬프트 경로 | 개발 | S4 | 공식 문서 재확인, 지원 요청 |
| ⑩ | 교육청 망 차단 사례 | 교사 | S9 | `netcheck` 실측 |
| ⑪ | 하네스 리포 인용 프레임워크 출처 | — | 무관 | 리포 주장으로만 취급 |

---

## 9. 부록

### 부록 A. 설계원리 24지침 ↔ 스프린트/기능 추적표

| 지침 | 기능/구현 위치 | 스프린트 | 검증(테스트·grep) | 파일럿 지표 [제안] |
|---|---|---|---|---|
| 1.1 | `InquiryCards` 5칸 ↔ `sessions`·`predictions`·`block_programs` | S2, S5 | E2E 카드 존재 | 카드 작성률 |
| 1.2 | 변인 블록 → 수치 슬롯 참조(`variable_ref`) | S1, S2 | `rules/variables.ts` 단위 | 참조 연결 비율 |
| 1.3 | 변경 리스너 → dryRun → 카드·패널·그래프 축 갱신 | S2, S5 | E2E 500 ms 갱신 | — |
| 1.4 | `StepStepper`(`aria-current`) + 3단 레이아웃 | S2 | jest-axe, E2E | — |
| 2.1 | `variable` 카테고리 블록 6종 | S1, S2, S8 | `blocks.ts`에 6종 존재 테스트 | 변인 블록 수정 횟수 |
| 2.2 | 순차 스택 + `until` 조건 블록 | S1, S2 | 골든 | — |
| 2.3 | 2계층 검증, 경고 배지·패널·aria-live | S2 | E2E 300 ms, jest-axe | 경고 후 수정률 |
| 2.4 | 자동 완성 없음, 예시 3단계, 변인 근거 게이트(교사 설정) | S2, S7 | verify `autocomplete` 0건 | 근거 입력률 |
| 3.1 | `PredictionGate` + `/api/run` 403 | S5 | API 테스트 | 예측 입력률 |
| 3.2 | `applyStep`는 블록 JSON만 입력 | S1 | grep 정답 경로 0건 | — |
| 3.3 | `matched`·`rationale_after` 입력, 스테퍼 게이트 | S5 | E2E | 사후 설명 작성률 |
| 3.4 | `runs`·`block_programs.version`·오버레이·diff | S3, S5 | RLS·골든 | 재실행 횟수 |
| 4.1 | 사다리 L0~L3 × `error_type` | S4, S5 | 회귀 fixture | 레벨 분포 |
| 4.2 | L0 시작, "내 생각 입력 → 힌트" | S4 | 회귀 | 시도 없는 재요청 비율 |
| 4.3 | 2회 실패/3분 정체 하강, 넛지 1회 | S4 | 상태 주입 단위 | 하강 발생률 |
| 4.4 | `scaffold_level` 페이딩 | S3, S4 | 단위 | 레벨 하락 추이 |
| 5.1 | `<상태>` 매 턴 주입 | S4 | 단위(실명 0건 포함) | — |
| 5.2 | 근거 질문 규칙, 변인 변경 시 "왜 바꿨어?" | S4 | 회귀 | 근거 답변 길이 |
| 5.3 | 코드 채점 → 셀/블록 지목, 값 비수정 | S5 | 단위·회귀 | 재시도 후 정답률 |
| 5.4 | `hint_level` 상한, 대신 작성 금지, 자동 완성 없음 | S4, S6 | verify `generateReport` 0건, 회귀 | — |
| 6.1 | 9항목 템플릿 | S6 | E2E | 섹션 작성률 |
| 6.2 | `MyRecordsPanel` | S6 | E2E | 패널 열람 횟수 |
| 6.3 | 결론 시작어·오차·개선안 필수 | S6 | 서버 422 | 오차 항목 작성률 |
| 6.4 | 성찰 4질문·제출 게이트 | S6 | 서버 422, E2E | 성찰 작성률 |

### 부록 B. 요구사항 (1)~(17) ↔ 스프린트 추적표

| 요구사항 | 스프린트 | 핵심 산출 |
|---|---|---|
| (1) 챗봇 개념 학습 | S4 | `/api/tutor`, KB 삽입부 |
| (2) 실험 설계 | S2, S8 | 변인 블록·탐구 카드·분리 실험 설계 단계 |
| (3) 막힐 때 도움 | S4 | 힌트 사다리 |
| (4) 블록 코딩 가상 실험 | S1, S2 | DSL·Blockly 래퍼 |
| (5) 조립으로 순서 익히기 | S1, S2 | 사전조건 테이블·예시 3단계 |
| (6) 모니터 실시간 오류 | S2 | 2계층 검증·깜빡임·배너 |
| (7) 결과 데이터 즉시 | S3, S5 | `measurements`·시드 |
| (8) 결과 분석·그래프 | S5, S8 | Recharts·오버레이·예측 그리기 |
| (9) HTML 6종 참고 | S1 | fixtures·골든 테스트 |
| (10) 계산값 입력·오답 도움 | S5 | `/api/check`·`error_type` |
| (11) 보고서 화면 | S6 | 9항목 템플릿 |
| (12) 느낀 점·성찰 | S6 | 4질문·게이트 |
| (13) 예측 먼저 | S5 | 예측 게이트·P1~P3 |
| (14) 교사 제출 | S6, S7 | `submissions` 상태 머신·반환 |
| (15) 학생/교사 화면·로그인·저장 | S3, S7 | Auth·RLS·대시보드 |
| (16) 설계원리.md 준수 | S0, S9 | CLAUDE.md 등록·impl 문서·verify·지표 |
| (17) 2022 개정 교육과정 | S1, S8 | `standards`·실험 6종·입자 개념 미전제 규칙 |

### 부록 C. 초기 시스템 프롬프트 초안

**공통부(`lib/tutor/prompts/common.ts`, 캐시 블록 1)** — research.md §5 예시를 기반으로 구조화 출력·말투 설정·안전 규칙을 보강했다.

```
<역할>
너는 중학교 2학년 '물질의 특성' 가상실험실의 과학 탐구 도우미야. 학생이 스스로 실험을 설계하고,
결과를 예측·해석하고, 탐구 보고서를 자기 힘으로 쓰도록 돕는다. 답을 대신 내주는 것이 아니라
학생의 생각을 끌어내는 것이 네 역할이다. 학생은 아직 원자·분자를 배우지 않았으므로 설명은
1학년 상태 변화(입자 운동) 수준까지만 쓴다.
</역할>
<말투>
<상태>.tone이 "haeyo"면 다정한 해요체, "banmal"이면 다정한 반말. 3~5문장. 수식은 평문으로
(27 ÷ 10 = 2.7 g/mL). 이모지는 응답당 최대 1개, 오답·안전 상황에서는 0개.
</말투>
<상태>  ← 앱이 매 턴 갱신(JSON). 여기 없는 수치는 모른다고 말한다.
unit, step{design|predict|run|interpret|report}, prediction_submitted, blocks_summary, changed_vars,
student_inputs, check{correct, error_type}, hint_level_max, fail_count, idle_seconds, nudge_sent,
scaffold_level, tone, answers_private(절대 말하지 않음)
</상태>
<힌트_규칙>
- 막혔을 때 정답이나 완성된 식을 바로 주지 않는다. 이유: 답을 먼저 받으면 추론 연습이 사라진다.
- hint_level_max 이하의 힌트 하나만, 질문은 한 응답에 하나만.
  0: 지금 하려는 것을 한 문장으로 다시 말하게 한다.
  1: 관련 개념 하나만 떠올리게 한다(공식의 의미를 묻되 공식은 쓰지 않는다).
  2: 첫 계산 단계를 예시 숫자로 보여 주고 학생 값으로 이어 하게 한다.
  3: 다음 한 단계(어느 탭의 어떤 블록을 어디에 끼우는지)를 명시하되, 왜 그런지 학생 말로 설명하면 다음으로 넘어간다.
- 시도 없이 다시 요청하면 같은 단계를 다른 말로 반복하고 "먼저 네 생각을 한 줄만 적어 줘"라고 한다.
- scaffold_level이 높으면(같은 유형 2회차 이상) 0단계만 먼저 준다.
</힌트_규칙>
<예측_규칙>
- prediction_submitted가 false이면 결과(그래프 모양, 뜨고 가라앉음, 녹는 양, 평탄 구간 온도)를
  말하지 않고 "먼저 네 예측을 적어 보자"로 응답한다.
- 예측을 못 하면 결과를 두 가지로 좁혀 고르게 하고, 비슷한 경험을 떠올리게 하고,
  그래도 어려우면 "틀려도 괜찮아, 그게 더 좋은 공부야"라며 선택을 받는다.
- 예측이 틀렸을 때 "틀렸다"가 아니라 "예측과 결과가 다른 것이 탐구의 핵심"으로 말한다.
- changed_vars가 2개 이상이면 "어느 변인 때문인지 알 수 있을까?"를 먼저 묻는다.
</예측_규칙>
<검증_규칙>
- 계산값의 정오는 네가 판단하지 않는다. <상태>의 check를 그대로 따른다. 이유: 학생이 우겨도
  데이터가 기준이어야 한다. 반박하면 사과하지 않고 표의 질량·부피 셀을 함께 다시 읽자고 한다.
- 오류를 지적할 때는 고칠 '칸'이나 '블록'을 하나만 지목하고 값은 주지 않는다. 학생 데이터("네 표 3행")로 되돌린다.
- 녹는점·끓는점·용해도 수치는 <상태>에 있는 값만 쓴다. 없으면 "시뮬레이션에서 직접 재 보자".
</검증_규칙>
<보고서_규칙>
- 어떤 섹션도 학생 대신 문장을 완성하지 않는다. 할 수 있는 것: 안내 질문 1개, 빈칸 문장 시작어 1개,
  루브릭 항목 이름으로 부족한 점 1가지.
- 느낀 점이 "재미있었다/신기했다"로 끝나면 예상-결과 차이, 어려웠던 순간, 바꿔 보고 싶은 변인 중 하나를 더 묻는다.
- "실패"라는 말 대신 오차 원인 1가지와 개선안 1가지를 쓰도록 돕는다.
</보고서_규칙>
<참여_규칙>
- idle_seconds ≥ 120이고 nudge_sent가 false이면 한 번만 짧게 묻는다. 연속 넛지는 하지 않는다.
- 무관한 대화가 3턴 이상이면 한 문장으로 받고 현재 단계의 다음 행동을 제안한다.
- 칭찬은 행동을 특정해 한 문장만("단위를 챙긴 게 좋았어").
- 위험 신호(자해·폭력·괴롭힘)가 보이면 공감 한 문장 후 선생님께 알리도록 안내하고 flag_teacher=true.
- 학생 이름·학교·연락처를 묻거나 저장하지 않는다. 과학 실험과 무관한 개인 상담은 선생님께 연결한다.
</참여_규칙>
<출력_형식>
JSON: {"reply": "...", "hint_level": 0-3, "next_action": "ask_rationale|edit_block|predict|run|enter_calc|write_section|none", "target_ref": "...", "flag_teacher": false}
</출력_형식>
```

**실험별 삽입부(`prompts/experiments/density.ts`, 캐시 블록 2)** — 예시:

```
<실험>
밀도 측정. 준비물: 저울, 비커, 눈금실린더, 물, 식용유, 큰 철조각, 작은 철조각.
핵심 개념: 밀도 = 질량 ÷ 부피, 물질의 양과 무관한 특성. 흔한 오개념: "큰 것이 밀도가 높다",
"밀도가 크면 뜬다", "좁은 그릇에 담으면 밀도가 커진다".
절차 포인트: 영점조정 → 용기 질량 → 시료 질량 → 부피(물 치환) → 계산. 고체는 물에 넣기 전에 질량을 잰다.
예시 순서(3단계까지만): 저울 영점조정 → 비커 올리고 질량 재기 → 물 50 mL 붓기.
독려: 큰 철조각과 작은 철조각의 밀도가 같을지 먼저 예상하게 한다.
</실험>
<참고_자료>  (교사 작성 KNOWLEDGE_BASE — 비유·예시 우선)
...
</참고_자료>
```

### 부록 D. Supabase 핵심 SQL 발췌

```sql
-- 0001_init.sql (발췌; 전체 테이블은 §3.2)
create type public.app_role as enum ('student','teacher','admin');
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role app_role not null default 'student',
  display_name text not null,            -- 학번 또는 닉네임 (실명 금지)
  school text,
  consent_on_file boolean not null default false,
  consent_date date);
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id),
  name text not null, join_code text not null unique,
  settings jsonb not null default '{"hint_level_editing":"slots","tone":"haeyo","max_runs":null,"rationale_gate":false}');
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id), class_id uuid references public.classes(id),
  experiment_id uuid references public.experiments(id), assignment_id uuid,
  seed text not null, status text not null default 'in_progress',
  current_step text not null default 'design', scaffold_level int not null default 0,
  started_at timestamptz default now(), submitted_at timestamptz);
create table public.runs (                       -- 지침 3.4
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  run_no int not null, program_version int not null, seed text not null,
  params jsonb, result_summary jsonb, diagnostics jsonb, created_at timestamptz default now(),
  unique (session_id, run_no));
create table public.predictions (                -- 지침 3.1·3.3
  id bigint generated always as identity primary key,
  session_id uuid references public.sessions(id) on delete cascade, run_id uuid references public.runs(id),
  target text not null, choice text, rationale text, matched boolean, rationale_after text);
create table public.events (                     -- 대시보드 원천, 불변
  id bigint generated always as identity primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  event_type text not null, payload jsonb, ts timestamptz default now());
-- 정답 비노출 뷰
create view public.experiments_public as
  select id, slug, title, spec - 'answers' - 'simParams' as spec_public, is_published from public.experiments;

-- 0002_rls.sql (발췌)
create schema if not exists private;
create or replace function private.my_teaching_class_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.classes where teacher_id = (select auth.uid()) $$;
revoke all on function private.my_teaching_class_ids() from public, anon;
grant execute on function private.my_teaching_class_ids() to authenticated;

create or replace function private.my_session_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.sessions where student_id = (select auth.uid())
  union select id from public.sessions where class_id in (select private.my_teaching_class_ids()) $$;

alter table public.sessions enable row level security;
create policy "student selects own" on public.sessions for select to authenticated
  using ((select auth.uid()) = student_id);
create policy "student updates own in-progress" on public.sessions for update to authenticated
  using ((select auth.uid()) = student_id and status = 'in_progress')
  with check ((select auth.uid()) = student_id);
create policy "teacher selects class sessions" on public.sessions for select to authenticated
  using (class_id in (select private.my_teaching_class_ids()));

alter table public.runs enable row level security;
create policy "runs select by session" on public.runs for select to authenticated
  using (session_id in (select private.my_session_ids()));
create policy "runs insert by owner in-progress" on public.runs for insert to authenticated
  with check (session_id in (select id from public.sessions
    where student_id = (select auth.uid()) and status = 'in_progress'));
-- block_programs, measurements, predictions, reports, chat_messages, events: 동일 패턴

-- 0003_rpc_join_class.sql
create or replace function public.join_class(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_class uuid;
begin
  select id into v_class from public.classes where join_code = upper(p_code);
  if v_class is null then raise exception 'invalid_join_code'; end if;
  insert into public.enrollments(class_id, student_id) values (v_class, (select auth.uid()))
  on conflict do nothing;
  return v_class;
end $$;
```

### 부록 E. 블록 DSL JSON 예시 (밀도 실험 3블록)

```json
{
  "experiment": "density",
  "programVersion": 3,
  "variables": [
    { "kind": "independent", "name": "철조각의 크기", "refs": ["q_iron_big", "q_iron_small"] },
    { "kind": "dependent", "name": "밀도(질량÷부피)", "refs": [] },
    { "kind": "controlled", "name": "물의 양", "refs": ["q_water_50"] }
  ],
  "groups": [
    {
      "id": "g1", "kind": "experimental",
      "steps": [
        { "blockId": "b1", "action": "zero_scale", "subject": "scale" },
        { "blockId": "b2", "action": "measure_mass", "subject": "iron_big", "target": "scale",
          "slots": { "item": { "type": "equip", "ref": "iron_big" } } },
        { "blockId": "b3", "action": "pour", "subject": "water", "target": "cylinder", "qty": 50, "unit": "mL",
          "slots": { "liquid": { "type": "equip", "ref": "water" }, "amount": { "type": "quant", "ref": "q_water_50" } } }
      ]
    }
  ],
  "measurement": [ { "instrument": "scale", "resolution": 0.1 }, { "instrument": "cylinder", "resolution": 0.5 } ]
}
```

이 프로그램을 `dryRun()`에 넣으면 `b2`는 `scale.zeroed=true`(b1)이므로 통과하고, 이후 `submerge_solid(iron_big)` 블록이 추가되면 `iron_big.massMeasured=true`로 통과하지만, 순서를 바꿔 b2보다 앞에 두면 `{blockId:'b4', severity:'error', code:'mass_before_submerge', guideline:'2.3'}`이 반환된다. 통제변인 "물의 양"이 비교 집단에서 다른 수치를 참조하면 `rules/variables.ts`가 `{code:'controlled_var_mismatch', guideline:'2.1'}`을 추가한다.

---

*끝. 이 문서의 스프린트 계약 문구는 `/edu-harness` 입력으로 그대로 사용하고, 각 스프린트 종료 시 `progress.md`·`docs/design-principles-impl.md`·`HARNESS_CHANGELOG.md`를 갱신한다.*
