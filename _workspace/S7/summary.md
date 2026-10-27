# S7 — 교사 대시보드 (지침 1.4 교사 뷰·4.4·5.1·6.3, R6·R8·R11, D11)
구현: lib/events/{types,fold,cards}.ts(불변 events 로그 → 학생별 단계·체류·실행·계산·예측·AI 대화·플래그, 막힘 판정, 4카드),
lib/server/dashboard.ts(RLS 읽기: classBoard·dashboardOverview·sessionDetail·submissionDetail), /api/grade(draft|return), /api/class/assignment,
0006_teacher.sql(grade_drafts, app_save_grade_draft, app_return_submission+grade_audit_log, app_update_assignment, session_started 트리거,
app_log_events 클라이언트 이벤트 8종 제한, Realtime publication), 화면: /dashboard(4카드·실시간), /dashboard/classes/[id]/live(정렬 보드·마감 조정),
/dashboard/sessions/[id](블록·실행/그래프·예상·AI 대화 탭), /dashboard/submissions/[id](보고서 읽기·AI 도움 표시·루브릭·코멘트 뱅크·돌려주기)
막힘: 체류 ≥ max(5분, 활동 중 학생 중앙값×2) / 실행 오류 연속 3회 / 같은 계산값 3회 재시도. 카드마다 "다음 행동" 한 줄.
수용 기준: fold 막힘 3케이스 ✓(unit) / Realtime 구독은 components/teacher만 ✓(unit 경계 테스트·verify P6) / 학생 화면 반 평균·순위 0건 ✓ /
반환 → returned·재편집·재제출 version+1·regrade 감사 로그 ✓(DB) / 타 반 교사 sessions·events·submissions 0행 ✓(DB) / 이벤트 위조 차단 ✓(DB·route)
/ jest-axe: LiveBoard(caption·aria-sort)·FourCards·RubricGrader(fieldset)·ReportReadOnly ✓
미완(외부 의존): 실제 Supabase Auth·Realtime이 필요한 교사 E2E(제출→카드→채점→반환, 플래그 10초 내 표시)는 DEPLOY.md 스테이징 점검표로 이관.
로컬 E2E는 교사 영역 로그인 가드·채점 API 401만 확인.
테스트: unit 417 passed(25 live skipped), DB 38 passed, E2E 11 passed
