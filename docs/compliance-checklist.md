# 규제·안전·접근성 체크리스트

> 기준: docs/plan.md §7, docs/research.md §9. 법률 자문 전 초안 — 처리방침 문구는 학교·교육청 확인 후 확정.

| # | 항목 | 구현 | 위치 | 상태 |
|---|---|---|---|---|
| R1 | 만 14세 미만 보호자 동의 | 학교 서면 동의 수령 → 교사가 `consent_on_file` 체크, 미체크 학생 세션 생성 차단(`start_session` → `consent_required`) | `0003_rpc.sql`, 교사 학생 관리 | ⬜ |
| R2 | 실명·이메일 미수집 | 학생 = 반 코드 + 학번/닉네임 + PIN, 내부용 합성 로그인 ID | `src/lib/server/students.ts` | ⬜ |
| R3 | 국외 이전 고지 5항목 | 처리방침에 Supabase·Vercel·Anthropic 각각 이전 항목/국가·시기·방법/받는 자/목적·보유기간/거부 방법 | `src/app/privacy/page.tsx` | ⬜ |
| R4 | 프롬프트 개인정보 최소화 | `<상태>`에 세션 단계·블록 요약만, display_name·학교 없음 | `stateInjection.ts` + 테스트 | ⬜ |
| R5 | AI 고지 | 로그인 화면 1회 확인 + 튜터 패널 상단 상시 표시 | `TutorPanel.tsx`, 로그인 | ⬜ |
| R6 | 채팅 로그 열람 정책 | 교사는 자기 반 대화 열람, 학생에게 고지 | 대시보드 학생 상세, 처리방침 | ⬜ |
| R7 | 미성년자 안전 프롬프트 | 과학 범위, 위험 신호 시 공감 1문장 + 선생님 안내 + `flag_teacher` | `prompts/common.ts` | ⬜ |
| R8 | 유해 콘텐츠 필터·신고 | 키워드 필터 + 모델 플래그 → `events.ai_flagged` → 대시보드 카드 | `safety.ts`, `FourCards` | ⬜ |
| R9 | 연령 확인 대체 | 교사 명부 기반 계정 발급(service role) | `/api/class/students` | ⬜ |
| R10 | 데이터 보존·삭제 | Anthropic API 기본 30일 보존 고지, 반 단위 삭제(cascade) | 처리방침, `delete_class_data` | ⬜ |
| R11 | 교사 최종 판단 | AI 피드백은 초안, 교사 확정 후 반환, "AI 도움 받은 부분" 체크 | 채점 화면, 제출 게이트 | ⬜ |
| R12 | 정답·물성 서버 전용 | `physics.ts`·`grader` server-only, verify P2 | `src/lib/engine` | ⬜ |
| R13 | 학교 망 | `/netcheck` 페이지, 커스텀 도메인 권장 | `src/app/netcheck` | ⬜ |
| R14 | 접근성(KWCAG 2.2) | jest-axe + 키보드 경로 + 대비 4.5:1 + 44px + 정지 버튼 | `tests/a11y` | ⬜ |
