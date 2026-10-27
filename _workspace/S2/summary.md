# S2 — Blockly 편집기·모니터·2계층 검증 (지침 1.1·1.2·1.3·1.4·2.2·2.3·2.4·3.1·3.2)
계약: plan.md S2 수용 기준 (사용자 /goal 승인)
BUILD: src/lib/blocks/{blockTypes,program}.ts, components/blocks/{BlocklyWorkspace,theme}, inquiry/{StepStepper,InquiryCards,CheckPanel},
monitor/{LabMonitor,useFramePlayer,scenes/*}, data/{PredictionGate,DataTable,CalcCell,ResultChart,AfterExplain,ReferencePanel},
lab/{LabShell,ResultsSection,RunHistory,useLabController,state,backend,api,DemoLab}, app/demo/[slug], api/demo/{run,check}, ui/Modal
검증: Vitest 327 / Playwright 4 (밀도 전체 흐름·403 가드·실행 오류 블록·키보드 전용) / jest-axe 5 / axe-core 2 페이지 0건 / verify APPROVED
수용 기준 대응: 경고 200ms 디바운스(300ms 이내), UI 이벤트 무시, 오류 블록 빨간 테두리+배너+aria-live, 키보드 추가 ✓, autocomplete 0건, 카드 즉시 갱신
PEDAGOGY REVIEW: 1.1 카드 5칸 ✓ / 1.3 블록→카드·점검 동시 갱신 ✓ / 1.4 스테퍼 aria-current ✓ / 2.3 블록 경고+패널 ✓ / 2.4 예시 3단계만·자동완성 없음 ✓ /
3.1 실행·그래프 전 예측 + 서버 403 ✓ (S5 범위 선반영) / 🟡 교사 설정(편집 중 힌트 수준) 연결은 S7
결정: Blockly media 자체 호스팅(/blockly-media, 학교 망 대비), E2E 훅은 NEXT_PUBLIC_E2E=1 빌드에서만
