# S5 — 데이터 표·계산값 채점·예측 게이트·그래프 (지침 1.3·3.1·3.2·3.3·3.4·4.1·5.3)
대부분 S2에서 선구현: DataTable·CalcCell(서버 채점, error_type 안내, 재시도 무제한), PredictionGate(P1~P3), /api/run·/api/demo/run 403,
ResultChart(질량–부피·시간–온도·양 막대, 이전 실행 점선 오버레이, 표로 보기), AfterExplain(matched·rationale_after), RunHistory
S5 추가: 교사 설정 연결 — 편집 중 점검 수준(all/slots/none, 튜터에도 동일 적용), 변인 이유 필수 게이트(rationale_gate), a11y 테스트 3
수용 기준: 예측 없이 실행 403 ✓(E2E·DB·라우트) / 그래프는 모든 예측 후에만 렌더 ✓ / check 응답 정답값 없음 ✓ / 밀도 오류 유형 5종+ ✓ /
"틀렸습니다" 0 ✓ / seed 다른 학생 7.9±3% ✓ / 사후 설명 전 보고서 잠금 ✓ / 차트 옆 표 ✓
