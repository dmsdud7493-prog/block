교육학적 검토: S1 공통 엔진
| 지침 | 판정 | 근거 |
|---|---|---|
| 2.1 | 충족 | dsl/variableBlocks.ts 6종 + 실험별 variableOptions |
| 2.2 | 충족 | 순차 스택 리듀서, 프로토타입 순서 규칙 이식 |
| 2.3 | 충족 | rules/slots.ts, rules/variables.ts(controlled_var_mismatch 등), 리듀서 오류 문구 |
| 3.2 | 충족 | simulate는 Program(블록)만 입력, 정답 경로 하드코딩 0건 |
| 3.3 | 충족 | changedVariables, filter_before_cool 경고(비교 시도 허용) |
| 3.4 | 부분 | runs 스키마 확정(docs/engine.md §5), 테이블은 S3 |
| 5.3 | 충족 | grader error_type + ERROR_HINTS(행동 지목, 값 미제시) |
🟡 재결정 실험에서 처음에 "식히기 전 거르기"를 오류로 막았던 것을 프로토타입대로 비교 시도 허용 + 경고로 되돌림
🟡 가열 실험의 평탄 온도는 그래프 읽기 과제라 시계열로 클라이언트에 간다(설계상 허용) — 정답 공식이 아니라 관찰 데이터
종합 의견: 형성평가(재시도 무제한, 정답값 비노출), 격려형 문구 확인. 🔴 없음.
