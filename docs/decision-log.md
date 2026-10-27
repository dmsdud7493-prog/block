# decision-log.md — 아키텍처 결정 기록 (ADR)

> **목적**: 프로젝트의 중요한 기술적·설계적 결정을 구조화된 형식으로 기록합니다.
> 결정의 맥락, 이유, 대안, 결과를 남겨 미래의 팀원(또는 AI 에이전트)이 "왜 이렇게 됐는가"를 이해할 수 있도록 합니다.
>
> **작성 시점**: 아키텍처 변경, 기술 스택 선택, 중요한 트레이드오프 결정 시
> **progress.md 연결**: `decisions_taken` 앵커 필드에 이 파일의 ADR ID를 참조하세요

---

## ADR 작성 형식

```markdown
## ADR-NNN: [결정 제목]

**날짜**: YYYY-MM-DD
**상태**: ACTIVE | SUPERSEDED(ADR-XXX) | DEPRECATED

### 맥락 (Context)
[이 결정이 필요했던 배경과 문제 상황]

### 결정 (Decision)
[우리가 선택한 것]

### 고려한 대안 (Alternatives Considered)
- **대안 A**: [설명] — 선택 안 한 이유: [이유]
- **대안 B**: [설명] — 선택 안 한 이유: [이유]

### 결과 (Consequences)
- **긍정적**: [이 결정으로 얻는 것]
- **부정적**: [이 결정으로 감수하는 것]
- **중립**: [변화는 있지만 좋고 나쁨 없는 것]
```

---

## Status 정의

| Status | 의미 |
|--------|------|
| **ACTIVE** | 현재 유효한 결정. 코드베이스에 반영됨 |
| **SUPERSEDED(ADR-XXX)** | ADR-XXX로 대체됨. 더 이상 유효하지 않음 |
| **DEPRECATED** | 더 이상 유효하지 않으나 대체 ADR 없이 폐기됨 |

---

## 실제 예시 ADR

## ADR-001: 하네스 설계 — verify.sh REJECTED를 src/ 없는 템플릿의 정상 상태로 정의

**날짜**: 2026-04-04
**상태**: ACTIVE

### 맥락 (Context)
EduHarness는 GitHub Template Repository로 배포됩니다. 새로 clone한 사용자는 `src/` 디렉토리가 없는 상태에서 시작합니다. verify.sh는 `src/` 없으면 Dim 2 (isCorrect 노출 검사)가 H_TOTAL++만 하고 H_PASS를 올리지 않아 HIGH < 100% → VERDICT=REJECTED가 됩니다.

### 결정 (Decision)
VERDICT=REJECTED를 "미구현 템플릿 프로젝트의 정상 상태"로 정의합니다. verify.sh를 수정해서 src/ 없을 때 APPROVED를 반환하도록 만들지 않습니다.

### 고려한 대안 (Alternatives Considered)
- **대안 A**: src/ 없으면 APPROVED 반환 — 선택 안 한 이유: 실제로 구현이 없는데 합격을 주면 하네스가 무의미해짐
- **대안 B**: src/ 없으면 SKIPPED 판정 추가 — 선택 안 한 이유: 새 VERDICT 추가는 settings.json, docs 등 여러 파일 변경 필요. 복잡성 증가 대비 이점 적음

### 결과 (Consequences)
- **긍정적**: "왜 REJECTED인가?"라는 질문이 생기면 항상 "미구현 때문"이라는 명확한 답이 있음
- **부정적**: 새 사용자가 처음 verify.sh 실행 시 REJECTED를 보고 당황할 수 있음
- **중립**: docs/example-walkthrough.md에서 이 동작을 설명함

---

## ADR-002: 하네스 설계 — CLAUDE.md를 AI 자율 수정 가능, verify.sh는 사용자 승인 필수

**날짜**: 2026-04-04
**상태**: ACTIVE

### 맥락 (Context)
AI가 코딩 작업 중 새 패턴을 발견했을 때 하네스를 즉시 업데이트하고 싶습니다. 그러나 verify.sh 채점 기준을 AI가 자율 변경하면 "목표를 달성하기 위해 채점 기준을 낮추는" Goodhart's Law 문제가 발생합니다.

### 결정 (Decision)
CLAUDE.md(규칙 문서)는 AI 자율 수정 허용. verify.sh(채점 기준)은 사용자 승인 필수.

### 고려한 대안 (Alternatives Considered)
- **대안 A**: 둘 다 AI 자율 수정 — 선택 안 한 이유: Goodhart's Law — AI가 점수를 올리기 위해 기준을 낮출 위험
- **대안 B**: 둘 다 사용자 승인 — 선택 안 한 이유: CLAUDE.md 규칙 발견이 즉각 반영되지 않으면 하네스 진화가 느려짐

### 결과 (Consequences)
- **긍정적**: 채점 기준의 무결성 유지. CLAUDE.md는 빠르게 진화
- **부정적**: verify.sh 업데이트 시 마찰 발생 (의도적 마찰)
- **중립**: harness-evolve.sh가 이 구분을 자동으로 강제함

---

## ADR 추가 방법

새 결정이 생기면:
```
1. ADR-NNN 번호 할당 (이전 번호 + 1)
2. 위 형식으로 이 파일에 추가
3. progress.md 컨텍스트 앵커의 decisions_taken 필드 업데이트
4. git commit -m "docs: ADR-NNN [결정 제목 한 줄 요약]"
```

---

# 프로젝트 ADR — 물질의 특성 가상실험실

## ADR-P01: Next.js `cacheComponents` 비활성화

**날짜**: 2026-10-27 · **상태**: ACTIVE
### 맥락
create-next-app 16.4가 `cacheComponents: true`를 기본으로 켰다. 이 모드에서는 `cookies()`를 읽는 모든 컴포넌트가 Suspense 경계 안에 있어야 하며, 위반은 빌드 오류다.
### 결정
끈다. 학생·교사 화면 거의 전부가 로그인 사용자별 동적 데이터라 정적 셸 이점이 작다.
### 대안
- 켜고 `use cache: private` + Suspense 패턴 — 모든 페이지에 경계 설계 비용, 학교 Chromebook에서 체감 이득 불확실.
### 결과
- 긍정: 인증 코드가 단순. 부정: 공개 페이지(처리방침 등) 정적 프리렌더 이점 일부 포기.

## ADR-P02: `src/` 디렉토리 레이아웃

**날짜**: 2026-10-27 · **상태**: ACTIVE
### 맥락
plan.md §3.1은 루트 `app/`·`lib/`를 예시했지만, EduHarness `verify.sh`는 기본 검사 경로가 `src/`다.
### 결정
`src/app`, `src/lib`, `src/components`를 쓴다. plan.md의 경로는 `src/` 접두어를 붙여 읽는다.
### 결과
하네스 검사가 별도 인자 없이 전 코드에 적용된다.

## ADR-P03: 교육적 게이트를 Postgres 함수(RPC)로 강제

**날짜**: 2026-10-27 · **상태**: ACTIVE
### 맥락
지침 3.1(예측 먼저), 6.4(성찰 후 제출), 동의 확인은 UI만으로는 우회된다(DevTools로 API 직접 호출).
### 결정
`record_run`, `submit_report`, `start_session` 등 SECURITY INVOKER 함수가 RLS 아래에서 조건을 검사하고 `prediction_required`·`reflection_required`·`consent_required` 예외를 던진다. Route Handler는 이를 403/422로 변환한다.
### 결과
- 긍정: 로컬 Postgres만으로 게이트를 테스트할 수 있고(tests/db), 어떤 클라이언트로 호출해도 동일하게 막힌다.
- 부정: 일부 비즈니스 로직이 SQL에 있다 — `docs/engine.md`와 테스트로 보완.

## ADR-P04: 시뮬레이션 물성·정답은 서버 전용, 클라이언트는 규칙만

**날짜**: 2026-10-27 · **상태**: ACTIVE
### 맥락
CLAUDE.md 규칙 3(평가 무결성). 프로토타입은 물성(밀도 등)과 계산 결과를 브라우저에 모두 갖고 있었다.
### 결정
실험 정의를 `catalog.ts`(블록·용품 종류·사전조건 규칙·예측 선택지 — 클라이언트 허용)와 `physics.ts`(물성 수치·노이즈·정답 공식 — `server-only`)로 나눈다. 편집 중 `dryRun`은 카탈로그 규칙만으로 클라이언트에서 돌고, 실제 `simulate`와 `check`는 `/api/run`·`/api/check`(데모는 `/api/demo/*`)에서만 돈다. verify P2가 클라이언트의 physics/grader import를 CRITICAL로 막는다.
### 결과
- 긍정: 정답 공식·물성값이 번들에 없다. 편집 중 피드백은 여전히 즉시(서버 왕복 없음).
- 부정: 실행마다 서버 왕복 1회(프레임 수 KB 수준).

## ADR-P05: 튜터는 비스트리밍 구조화 출력

**날짜**: 2026-10-27 · **상태**: ACTIVE
### 맥락
plan.md §3.5는 스트리밍 + 메타데이터 추출 방식을 S4에서 택1하도록 남겼다. `hint_level` 상한 검증(지침 5.4)과 `flag_teacher` 처리는 응답 전체를 본 뒤에야 가능하다.
### 결정
`generateText` + `Output.object`(zod 스키마)로 `{reply, hint_level, next_action, target_ref, flag_teacher}`를 받고, 서버가 상한·정답 숫자 누설을 검사한 뒤 응답한다. 위반 시 1회 재요청, 그래도 위반이면 로컬 규칙 응답으로 대체한다. UI는 타이핑 효과로 표시한다.
### 대안
- 스트리밍 텍스트 + 말미 JSON 트레일러 — 검사 전에 정답이 학생 화면에 흘러갈 수 있음.
### 결과
- 긍정: 정답 누설·레벨 초과를 학생에게 보이기 전에 차단. 부정: 첫 글자까지 지연(Haiku 기준 수 초) — 부하 테스트로 p95 확인.

## ADR-P06: Supabase 미설정 시 데모 모드

**날짜**: 2026-10-27 · **상태**: ACTIVE
### 맥락
교사가 계정 설정 전에 체험하고, CI E2E가 외부 서비스 없이 돌아야 한다.
### 결정
`/demo/[slug]`는 로그인·저장 없이 같은 컴포넌트·엔진을 쓴다. 서버 판정은 상태 없는 `/api/demo/run`·`/api/demo/check`가 seed와 프로그램을 받아 재계산한다. 튜터는 `ANTHROPIC_API_KEY`가 없으면 로컬 규칙 튜터(`localTutor.ts`)로 응답한다.
### 결과
E2E가 결정론적이고, 교사 시연이 쉽다. 데모 결과는 저장되지 않음을 화면에 표시한다.

## ADR-P07: 쓰기는 서버 함수만, 로그인 사용자는 읽기 전용 RLS

**날짜**: 2026-10-27 · **상태**: ACTIVE
### 맥락
Supabase 공개 키는 브라우저에 있으므로 학생이 개발자 도구로 직접 `insert into measurements (is_correct=true)`를 시도할 수 있다. 채점·실행 결과는 평가 무결성(CLAUDE.md 규칙 3) 대상이다.
### 결정
`authenticated`에는 SELECT 정책만 두고 INSERT/UPDATE/DELETE 권한을 회수한다. 모든 쓰기는 `app_*` SECURITY DEFINER 함수로 하되 실행 권한은 `service_role`에만 준다. Route Handler가 `getClaims()`로 사용자를 확인한 뒤 서버에서만 호출한다. 교육적 게이트(예측·동의·성찰·잠금)도 이 함수들 안에 있다(ADR-P03).
### 결과
- 긍정: 클라이언트가 어떤 경로로 와도 채점값·실행 결과를 위조할 수 없다(tests/db/gates.test.ts가 직접 쓰기 거부를 검증).
- 부정: 모든 쓰기가 서버 왕복을 거친다. Realtime은 읽기 정책 기준으로만 동작(교사만 events 구독).

## ADR-P08: 학생 계정 = 반 코드 + 번호 + PIN (내부 합성 로그인 ID)

**날짜**: 2026-10-27 · **상태**: ACTIVE
### 결정
교사가 번호 목록을 넣으면 서버가 `s-<uuid>@STUDENT_EMAIL_DOMAIN` 형식의 내부 ID와 `sha256(STUDENT_PIN_PEPPER:반코드:PIN)` 비밀번호로 계정을 만든다. 실명·이메일·전화번호는 받지 않는다(R2). PIN은 생성 직후 한 번만 보여 주고 재발급할 수 있다. 공개 회원가입은 끄고(교사도 서버 액션으로 학교 도메인 확인 후 생성) 역할은 `app_metadata.role`로 지정한다.
