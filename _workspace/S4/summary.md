# S4 — AI 튜터 (지침 2.4·4.1~4.4·5.1~5.4, R4·R5·R7·R8)
BUILD: lib/tutor/{prompts/common·knowledgeBase·experiments/*(프로토타입 추출)·index, schemas, ladder, stateInjection, safety, localTutor, respond, model, service, chips},
api/tutor(체험: 규칙 기반 기본·DEMO_TUTOR_ENABLED 시 Claude, 세션: 저장·플래그), migration 0004_tutor(app_add_chat·app_set_scaffold·app_tutor_context),
components/tutor/{TutorPanel, HintLadderBadge, context, useIdle}
결정: ADR-P05(비스트리밍 구조화 출력 + 서버 강제), AI SDK v7 instructions 배열로 캐시 블록 2개
검증: 사다리 7, 상태·안전 5, respond(모의 모델) 6, 회귀 25(규칙 기반 경로 항상 / 실제 Claude는 RUN_LLM_REGRESSION=1), DB 2, E2E 1
수용 기준: api.anthropic.com 문자열 src/app/api 밖 0건 ✓, 회귀 fixture 규칙 검사 ✓(25), cacheReadTokens 기록 ✓(meta.usage, 모의 모델로 검증 — 실키 측정은 배포 후),
fail_count≥2·idle≥180 → hint_level≥2 ✓, 넛지 세션당 1회(ai_nudge 이벤트) ✓, flagged → events.ai_flagged ✓
회귀 세트가 잡은 결함: 규칙 기반 튜터가 '변인 2개 동시 변경' 질문 규칙을 빠뜨림 → 수정
