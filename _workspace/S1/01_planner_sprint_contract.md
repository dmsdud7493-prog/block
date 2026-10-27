스프린트 계약: S1 공통 엔진 (지침 2.1·2.2·2.3·3.2·3.4·5.3)

완료 조건:
- [ ] 6개 실험 정상 경로 fixture에서 simulate() 측정값(노이즈 0)이 프로토타입 기대값과 일치 (밀도 7.9·물 1.0·식용유 0.92, 라우르산 평탄 44℃, 에탄올 78℃, 분리2 석출량)
- [ ] 오류 경로 fixture(영점 미조정 측정, 질량 재기 전 침수, 장치 미완성 가열, 통제변인 불일치)에서 기대 code 포함
- [ ] dryRun()과 simulate()의 diagnostics code 집합이 모든 fixture에서 동일
- [ ] 같은 seed 두 번 → 깊은 동등, seed 다르면 측정값 다르되 평탄 중심 차 ≤ 0.5℃
- [ ] grader/check 각 error_type 케이스 통과, 응답에 정답값 키 없음 (FORMATIVE, 재시도 무제한)
- [ ] 정답 경로 하드코딩 없음 (grep correctOrder|answerSteps 0건)
- [ ] 변인 설계 블록 6종이 DSL에 존재
비완료 조건: Blockly UI(S2), DB 테이블 생성(S3 — runs 스키마는 docs/engine.md에 확정)
