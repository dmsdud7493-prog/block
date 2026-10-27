# S1 PLAN — 공통 엔진 (docs/plan.md Sprint 1)
영향 파일: src/lib/engine/** (신규), fixtures/prototypes/*.json, tests/unit/engine/*, docs/engine.md
작업 분해:
1. 코어: types, guidelines, rng, josa/format, rules/slots, rules/variables, simulator/run(simulate·dryRun), grader(check·errorTypes·assessment)
2. 밀도 실험: catalog(블록·용품·변인 선택지·예측 타깃) / reducer(프로토타입 applyStep 이식) / physics(server-only)
3. 나머지 5종: 같은 계약으로 이식 (병렬 작업자에 위임, 각자 catalog/reducer/physics/fixtures/tests)
4. 골든·오류 경로·결정성·dryRun=simulate 진단 동일 테스트
위험: 실험별 상태 모델 상이 → 공통 프레임워크 + 실험별 리듀서로 분리(ADR-P04 연장)
승인: docs/plan.md(사용자 /goal 승인)에 포함된 스프린트 — 별도 승인 생략
