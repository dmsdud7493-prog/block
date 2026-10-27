# 설계원리 24지침 ↔ 구현 추적표

> 기준: `설계원리.md`(재구성안, 6원리×4지침). 지침 ID 상수는 `src/lib/engine/guidelines.ts`.
> 원문 확정으로 번호가 바뀌면 `guidelines.ts`의 매핑만 바꾸고, `events.payload.guideline` 값은 마이그레이션으로 재매핑한다.
> 상태: ✅ 구현·검증됨 / 🟡 부분 / ⬜ 미구현. 파일럿 지표는 `supabase/migrations/0008_compliance.sql`의 `v_guideline_metrics`(열 이름 `gNN_*`)가 계산한다. 이벤트 원천은 `events`(불변 로그, `payload.guideline` 태그).

| 지침 | 구현 위치 | 검증 | 파일럿 지표 (`v_guideline_metrics` 열 / events) | 상태 |
|---|---|---|---|---|
| 1.1 탐구 요소를 구분된 시각 요소로 | `components/inquiry/InquiryCards.tsx`(문제·가설·변인·절차·예상 카드), 블록 범주 색 구분 | jest-axe `components.test.tsx`, E2E | 카드 작성률(`sessions.inquiry`) | ✅ |
| 1.2 요소 간 관계 표현 | 변인 블록 ↔ 절차 수치 일관성 진단 `engine/rules/variables.ts` | 실험별 단위 테스트, `editor-settings.test.ts` | 진단 후 수정률(`block_edit`) | ✅ |
| 1.3 입력 변경 시 함께 갱신 | `useLabController.onProgram` → `dryRun` → 블록 경고·CheckPanel·카드 동시 갱신, 그래프 평탄 구간은 학생이 켬 | E2E `density.spec.ts` "점검 결과", 5종 E2E | — | ✅ |
| 1.4 전체 흐름 + 현재 단계 | 학생 `StepStepper`(`aria-current`) / 교사 `LiveBoard` 단계 열 | jest-axe, `fold.test.ts` | 단계별 체류 시간(fold) | ✅ |
| 2.1 변인·집단·측정 블록 | `engine/dsl/variableBlocks.ts` 6종, 두 집단 실행 겹쳐 그리기 | `variable-blocks.test.ts`, 3 g vs 6 g 단위 테스트 | 변인 블록 사용률 | ✅ |
| 2.2 배치로 순서·조건 명시 | 순차 절차 스택 + 반복 블록, 결정론적 리듀서 | `golden.test.ts`, 실험별 순서 오류 테스트 | — | ✅ |
| 2.3 누락·모순 시각 표시 | 2계층: 블록 경고 아이콘·테두리 + `CheckPanel`(aria-live) + 실행 시 오류 블록 깜빡임 | `determinism.test.ts`(dryRun=simulate 진단), E2E 실행 오류 | `g32_failed_run_share` | ✅ |
| 2.4 자동 완성 대신 근거 설명 | 예시 3단계만, 변인 근거 입력·게이트(교사 설정 `rationale_gate`), 자동 완성 없음 | verify P3, `editor-settings.test.ts` | `g24_rationale_rate` | ✅ |
| 3.1 실행 전 예상·이유 기록 | `PredictionGate`(+곡선 그리기 `SketchPad`) + DB `prediction_required` | `gates.test.ts`, 라우트 403, E2E | `g31_sketch_rate`, `prediction_made` | ✅ |
| 3.2 학생 설계를 반영한 실행 | `simulate(program)` 서버 실행, 모니터 장면 6종(서버 프레임 값만) | 골든 + 5종 E2E(표 = simulate 응답) | `g32_failed_run_share` | ✅ |
| 3.3 차이 원인 확인 | `AfterExplain`(matched·rationale_after), 그래프에 "내 예상(그림)" 겹치기, 미작성 시 보고서 잠금 | E2E | `g33_explained_rate`, `g33_matched_rate` | ✅ |
| 3.4 이전 시도·변경 보존 | `runs` 누적, `block_programs.version`, 바뀐 변인 기록, 이전 실행 점선 | DB `gates.test.ts` | `g34_runs_per_session` | ✅ |
| 4.1 단계·오류 유형별 단계적 도움 | `tutor/ladder.ts` L0~L3 × `error_type`, 상태 주입 | `ladder.test.ts` | `g41_ai_replies_per_session` | ✅ |
| 4.2 점검 질문 먼저 | L0 시작, 시도 없는 재요청은 같은 레벨, 예측 힌트 P1→P3 | `ladder.test.ts`, 회귀 25 | `g42_hints_per_prediction` | ✅ |
| 4.3 반복 오류·정체 시 개념·예시 | 실패 2회·정체 180초 → 하강, 120초 넛지(1회) | `ladder.test.ts`, E2E 튜터 | 넛지 발생(`ai_nudge`) | ✅ |
| 4.4 개선 시 지원 축소 | `sessions.scaffold_level` 페이딩, 교사 편집 중 점검 수준 설정 | `ladder.test.ts`, `editor-settings.test.ts` | `g44_avg_hint_level` | ✅ |
| 5.1 현재 단계·블록·결과 참조 | `tutor/stateInjection.ts` `<상태>`(이름·학교 제외) / 교사 학생 상세 탭 | `state-safety.test.ts` | — | ✅ |
| 5.2 선택 이유 설명 요구 | 프롬프트 규칙 + 바뀐 변인 근거 질문(로컬 튜터 포함) | 회귀 fixture | 근거 답변 길이 | ✅ |
| 5.3 수정 지점·근거 제시, 직접 수정 | 서버 채점 `error_type` → 칸 지목 안내, 값 미제시, 재시도 무제한(FORMATIVE) | `check.test.ts`, 회귀 | `g53_attempts_to_correct` | ✅ |
| 5.4 대신 작성 금지 | `hint_level` 서버 상한·정답 누설 필터·보고서 문장 미완성, 시작어 1개만 | verify P3, `respond.test.ts` | — | ✅ |
| 6.1 보고서 틀 | `report/template.ts` 9항목 | `template.test.ts`, E2E | 섹션 작성률 | ✅ |
| 6.2 기록 참조 | `MyRecordsPanel` + 기록 → "초안" 옮기기(해석·성찰 제외) | `template.test.ts`, E2E | — | ✅ |
| 6.3 가설–증거·오차·한계 | 해석 필수 4요소 + 교사 루브릭(반환 시 공개) | DB `report.test.ts`, `teacher.test.ts` | 루브릭 분포(`submissions.rubric_scores`) | ✅ |
| 6.4 제출 전 성찰 | 성찰 4질문 중 3개 이상 + DB `reflection_required` | DB `report.test.ts`, E2E | `g64_reflection_complete_rate` | ✅ |

> 남은 확인: 파일럿 실수업에서 지표 값 수집·해석(plan §8.2), 설계원리 원문 대조(교사 검토).
