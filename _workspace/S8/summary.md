# S8 — 실험 5종을 공통 화면 위에 (지침 1.3·2.1·3.1·3.3·3.4)
엔진(리듀서·카탈로그·채점·골든)은 S1에서 6종 모두 구현 → S8은 화면 쪽 확장.
구현: 모니터 장면 SVG 5종(Melting·Boiling·Solubility·Separation1·Separation2Scene + 공용 parts) — 수치·양은 서버 프레임/이벤트 값만 사용(ADR-P04),
TimeTempChart(실행·두 집단 곡선 겹치기, "평평한 구간 표시" 학생 토글 — 먼저 스스로 찾게, ReferenceArea), SolubilityChart(온도–녹은 양, 물 100 g 환산은
학생 계산 몫이라 그리지 않음), SketchPad 곡선 예측(ADR-P10, 녹는점·끓는점·증류 graph 타깃, 0007 predictions.sketch + app_set_prediction_sketch),
결과 그래프에 "내 예상(그림)" 겹치기.
수용 기준: 5종 E2E(설계→예측→실행→표→그래프→예상 비교→보고서 초안) ✓ / 표의 측정값 = /api/demo/run(simulate) 응답 ✓ /
plateau·solvent_basis·table_read 재현(단위, S1) ✓ / 3 g vs 6 g 평탄 온도 차 ≤ 1℃(단위) ✓ / 그리기 누름 반경 26px·숫자 입력 대안 ✓ /
TEXTBOOK_MODE 44/63 ↔ 43.9/61.9(단위) ✓ / axe: 데모 6종·로그인 페이지 ✓
미완: 대조 실험 프리셋 버튼(2차 범위), 프레임 재생 long task 계측(S9 성능 점검표로).
테스트: unit 425 passed(25 live skipped), DB 39 passed, E2E 16 passed(+axe 8) / verify 100 APPROVED
