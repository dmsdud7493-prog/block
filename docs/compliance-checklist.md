# 규제·안전·접근성 체크리스트

> 기준: docs/plan.md §7, docs/research.md §9. 법률 자문 전 초안 — 처리방침 문구는 학교·교육청 확인 후 확정.

| # | 항목 | 구현 | 위치 · 검증 | 상태 |
|---|---|---|---|---|
| R1 | 만 14세 미만 보호자 동의 | 교사가 `consent_on_file` 체크, 미체크 학생 세션 생성 차단 | `app_start_session` → `consent_required` · DB `gates`/`compliance` 테스트, 라우트 403 | ✅ |
| R2 | 실명·이메일 미수집 | 학생 = 반 코드 + 번호 + PIN, 내부용 합성 로그인 ID | `lib/server/students.ts` · DB 테스트(profiles에 이메일·실명 열 없음) | ✅ |
| R3 | 국외 이전 고지 | 처리방침: 법적 근거·이전 항목·국가·시기·방법·받는 자·목적·보유 기간·거부 방법과 효과(Supabase·Vercel·Anthropic) | `app/privacy/page.tsx` · E2E `compliance.spec.ts` | ✅ (학교 법무 검토 후 확정) |
| R4 | 프롬프트 개인정보 최소화 | `<상태>`에 단계·블록 요약만, 이름·학번·학교 없음, 이메일·전화 가림 | `stateInjection.ts`, `safety.ts` · `state-safety.test.ts` | ✅ |
| R5 | AI 고지 | 로그인 화면 + 튜터 패널 상시 표시 | `LoginForms.tsx`, `TutorPanel.tsx` · E2E | ✅ |
| R6 | 채팅 로그 열람 정책 | 교사는 자기 반 대화 전체 열람(학생 상세 "AI 대화" 탭, 플래그 강조), 학생·보호자 고지 | `SessionTabs.tsx`, 처리방침 §2, 튜터 패널 · RLS 테스트 | ✅ |
| R7 | 미성년자 안전 프롬프트 | 과학 범위, 위험 신호 시 고정 안내(109·1388) + 교사 플래그 | `prompts/common.ts`, `safety.ts` · 회귀 | ✅ |
| R8 | 유해 콘텐츠 필터·신고 | 키워드 필터 + 모델 플래그 → `ai_flagged` 이벤트 → 대시보드 "확인할 AI 대화" 카드 | `safety.ts`, `FourCards.tsx` · `fold.test.ts` | ✅ |
| R9 | 연령 확인 대체 | 교사 명부 기반 계정 발급(service role), 공개 가입 없음 | `/api/class/students` | ✅ |
| R10 | 데이터 보존·삭제 | 학생 삭제·반 삭제(cascade), 보존 기간 지난 계정 정리 함수, Anthropic 30일 삭제 고지 | `0008_compliance.sql` · DB `compliance.test.ts` | ✅ (정리 주기는 학교가 pg_cron으로 설정) |
| R11 | 교사 최종 판단 | 채점 초안은 교사만, 확정·반환 시 공개·감사 로그, "AI 도움 받은 칸" 자기 표시 | `RubricGrader`, `SubmitGate` · DB `teacher.test.ts` | ✅ |
| R12 | 정답·물성 서버 전용 | `physics`·`grader` server-only, 데모도 서버 재계산 | verify P2 · E2E 표 = 서버 응답 | ✅ |
| R13 | 학교 망 | `/netcheck`(서버·그림 파일·저장소·실시간), Blockly 그림 자체 호스팅, Realtime 막히면 30초 새로고침 | `app/netcheck` · E2E | ✅ (커스텀 도메인은 DEPLOY.md) |
| R14 | 접근성(KWCAG 2.2) | jest-axe + axe(E2E 10페이지) + 키보드 블록 조작 + 44px + 정지 버튼 + 차트 옆 표 | `tests/a11y`, `a11y.spec.ts` · `docs/kwcag-checklist.md` | ✅ (수동 점검 일부 파일럿 때) |
