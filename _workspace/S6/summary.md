# S6 — 탐구 보고서·성찰·제출 (지침 5.4·6.1~6.4, 요구사항 11·12·14)
구현: src/lib/report/{template,rubric,transcribe}.ts, components/report/{ReportView,ReportForm,ReflectionForm,SectionField,SubmitGate,MyRecordsPanel,ReturnNoteBox,useReport},
/api/report/draft(PUT, 자동저장)·/api/report/submit, 0005_report.sql(app_save_report·private.report_ready·app_submit_report), TutorPanel reportSection 모드
교육 설계: 9항목 보고서, 실험 기록 → 초안 옮기기(“초안” 표시, 해석·성찰은 옮기지 않음 — 5.4), 칸마다 안내 질문 1·시작어 1(문장 완성 없음),
성찰 4질문 중 3개 이상(10자+), 결론 4요소(가설 판단·근거·오차·개선안). 클라이언트 체크리스트와 DB report_ready가 같은 기준.
AI 도움 받은 칸 자기 표시(ai_assisted_sections, 정직성). 제출 후 잠금, 반환되면 다시 열림 → resubmitted. 지각: allow_late 정책.
루브릭(SUMMATIVE)은 반환 시에만 학생에게 보임(ReturnNoteBox, aria-live).
수용 기준: 성찰 미충족 제출 → reflection_required ✓(DB) / 마감 후 불허 → late_not_allowed ✓(DB) / 제출 후 저장 → session_locked ✓(DB) /
반환 후 재제출 → resubmitted·version 2 ✓(DB) / 초안 옮기기·해석 빈칸 ✓(unit·E2E) / 체크리스트 충족 전 제출 비활성 ✓(E2E) / a11y 3컴포넌트 ✓
테스트: unit 391 passed(25 live skipped), DB 28 passed, E2E 7 passed / verify SCORE=100 APPROVED
verify 정리: 보고서 칸의 안내 질문 prop을 question→guide로(퀴즈 아님), 반환 피드백 상자 ReturnNoteBox에 aria-live
