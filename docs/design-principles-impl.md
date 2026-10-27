# 설계원리 24지침 ↔ 구현 추적표

> 기준: `설계원리.md`(재구성안, 6원리×4지침). 지침 ID 상수는 `src/lib/engine/guidelines.ts`.
> 원문 확정으로 번호가 바뀌면 `guidelines.ts`의 매핑만 바꾸고, `events.payload.guideline` 값은 마이그레이션으로 재매핑한다.
> 상태: ✅ 구현·검증됨 / 🟡 부분 / ⬜ 미구현. 파일럿 지표는 `supabase/migrations/0004_views.sql`의 `v_guideline_metrics`가 계산한다.

| 지침 | 구현 위치 | 검증 | 파일럿 지표 | 상태 |
|---|---|---|---|---|
| 1.1 탐구 요소를 구분된 시각 요소로 | `src/components/inquiry/InquiryCards.tsx` (문제·가설·변인·절차·예상 5칸) | E2E `lab-flow.spec.ts` 카드 5개 존재 | 카드 작성률 | ⬜ |
| 1.2 요소 간 관계 표현 | 변인 블록 → 행동 블록 수치 참조 (`src/lib/engine/rules/variables.ts`) | `variables.test.ts` | 참조 연결 비율 | ⬜ |
| 1.3 입력 변경 시 함께 갱신 | `useLabWorkspace` → `dryRun` → 카드·점검 패널·스테퍼 동시 갱신 | E2E 블록 변경 후 카드 갱신 | — | ⬜ |
| 1.4 전체 흐름 + 현재 단계 | `src/components/inquiry/StepStepper.tsx` (`aria-current="step"`) | jest-axe, E2E | — | ⬜ |
| 2.1 변인·집단·측정 블록 | `src/lib/engine/dsl/variableBlocks.ts` (6종) | `dsl.test.ts` 6종 존재 | 변인 블록 수정 횟수 | ⬜ |
| 2.2 배치로 순서·조건 명시 | 순차 스택 + `until` 조건 행동 블록 | 골든 테스트 | — | ⬜ |
| 2.3 누락·모순 시각 표시 | 2계층 검증: 블록 경고(즉시) + `CheckPanel`(dryRun) + `aria-live` | `dryRun.test.ts`, E2E | 경고 후 수정률 | ⬜ |
| 2.4 자동 완성 대신 근거 설명 | 예시 3단계만, 변인 근거 입력(교사 설정 `rationale_gate`), 자동 완성 없음 | verify P3 | 근거 입력률 | ⬜ |
| 3.1 실행 전 예상·이유 기록 | `PredictionGate` + `record_run()` RPC `prediction_required` | `gates.test.ts`(DB), API 테스트 | 예측 입력률 | ⬜ |
| 3.2 학생 설계를 반영한 실행 | `simulate(program)` — 블록 JSON만 입력, 정답 경로 없음 | 골든, grep | — | ⬜ |
| 3.3 차이 원인 확인 | 결과 공개 후 `matched`·`rationale_after` 입력, 미입력 시 보고서 단계 잠금 | E2E | 사후 설명 작성률 | ⬜ |
| 3.4 이전 시도·변경 보존 | `runs`(run_no 누적), `block_programs.version`, 결과 그래프 오버레이 | DB 테스트 | 재실행 횟수 | ⬜ |
| 4.1 단계·오류 유형별 단계적 도움 | `src/lib/tutor/ladder.ts` L0~L3 × `error_type` | `ladder.test.ts` | 힌트 레벨 분포 | ⬜ |
| 4.2 점검 질문 먼저 | L0 시작, 시도 없는 재요청은 같은 레벨 | `ladder.test.ts`, 회귀 | 시도 없는 재요청 비율 | ⬜ |
| 4.3 반복 오류·정체 시 개념·예시 | `fail_count≥2` 또는 `idle≥180s` → L2 | `ladder.test.ts` | 하강 발생률 | ⬜ |
| 4.4 개선 시 지원 축소 | `sessions.scaffold_level` 페이딩 | `ladder.test.ts` | 레벨 하락 추이 | ⬜ |
| 5.1 현재 단계·블록·결과 참조 | `src/lib/tutor/stateInjection.ts` `<상태>` | `stateInjection.test.ts` | — | ⬜ |
| 5.2 선택 이유 설명 요구 | 프롬프트 규칙 + 변인 변경 시 근거 질문 | 회귀 fixture | 근거 답변 길이 | ⬜ |
| 5.3 수정 지점·근거 제시, 직접 수정 | 서버 채점 `error_type` → 셀/블록 지목, 값 미제시 | `check.test.ts`, 회귀 | 재시도 후 정답률 | ⬜ |
| 5.4 대신 작성 금지 | `hint_level` 서버 상한, 정답 숫자 필터, 보고서 문장 미완성 | verify P3, 회귀 | — | ⬜ |
| 6.1 보고서 틀 | `src/lib/report/template.ts` 9항목 | E2E | 섹션 작성률 | ⬜ |
| 6.2 기록 참조 | `MyRecordsPanel` (블록·runs·예측·변경 내역) + 자동 전사 "초안" | E2E | 패널 열람 횟수 | ⬜ |
| 6.3 가설–증거·오차·한계 | 해석 섹션 필수 필드(가설 판단·근거·오차·개선) | `submit_report` 422 | 오차 항목 작성률 | ⬜ |
| 6.4 제출 전 성찰 | 성찰 4질문 중 3개 이상 + 서버 게이트 | DB 테스트, E2E | 성찰 작성률 | ⬜ |
