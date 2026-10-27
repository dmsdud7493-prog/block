# S1 BUILD — 변경 파일
- src/lib/engine/{types,guidelines,rng,format}.ts, rules/{slots,variables}.ts, simulator/run.ts, grader/{check,errorTypes,assessment}.ts, dsl/variableBlocks.ts
- src/lib/engine/experiments/{types,physicsTypes,index,physicsRegistry}.ts
- experiments/density|melting|boiling|solubility|separation1|separation2/ (catalog·reducer·model·physics) — 5종은 병렬 작업자가 이식
- fixtures/prototypes/*.json (6종, 정상 14 + 오류 40여 시나리오), tests/unit/engine/*.test.ts, docs/engine.md
- 계약 보강: 시계열 조각 병합(mergeSeries), 비치명 경고(StepOutcome.warnings), 공개 참고 표(ReferenceTable), 괄호 조사 처리, ℉ 단위 실수
