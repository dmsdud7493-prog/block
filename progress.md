# progress.md — 물질의 특성 가상실험실

> AI 에이전트는 작업 시작 전 이 파일을 읽고, 작업 완료 후 반드시 업데이트합니다.
> 마지막 업데이트: 2026-10-27

---

## 컨텍스트 앵커

| 필드 | 내용 |
|---|---|
| intent | docs/plan.md Sprint 0~9 순서대로 구현 |
| changes_made | S0~S9 전부 구현 (각 스프린트 요약: `_workspace/S1~S9/summary.md`) |
| decisions_taken | ADR-P01~P11 (docs/decision-log.md) |
| next_steps | 사용자 계정으로 DEPLOY.md 실행(GitHub·Supabase·Vercel·Claude 키) → 스테이징 점검(교사 E2E·Realtime 10초·부하 30명) → 파일럿(docs/pilot-checklist.md) |
| test_status | unit 436 passed(실 API 회귀 25 skipped), DB 50 passed, E2E 28 passed(+axe 10페이지), verify SCORE=100 APPROVED |

---

## 스프린트 현황

| Sprint | 내용 | 상태 |
|---|---|---|
| 0 | 하네스·리포·인프라 | ✅ (외부 계정 연결은 DEPLOY.md 단계로 이관) |
| 1 | 공통 엔진·실험 spec·골든 테스트 | ✅ |
| 2 | Blockly 편집기·모니터·2계층 검증 | ✅ |
| 3 | Auth·스키마·RLS·학급·세션 저장 | ✅ |
| 4 | AI 튜터·힌트 사다리·안전 | ✅ |
| 5 | 데이터 표·채점·예측 게이트·그래프 | ✅ |
| 6 | 보고서·성찰·제출 | ✅ |
| 7 | 교사 대시보드 | ✅ (Auth·Realtime 연결 E2E는 스테이징 점검표) |
| 8 | 실험 5종 확장 | ✅ |
| 9 | 컴플라이언스·접근성·성능·배포 준비 | ✅ (스테이징 부하·비용 실측은 배포 후) |

---

## 알려진 이슈 / 외부 의존

| # | 내용 | 해소 방법 |
|---|---|---|
| E1 | GitHub 리포 생성·푸시, Supabase 프로젝트(서울), Vercel 연결, Anthropic API 키는 사용자 계정 인증 필요 | `DEPLOY.md` 단계별 실행 |
| E2 | plan.md §8.2 미확인 사항(고시문 원문 대조, 교과서 수치, 루브릭 문구) | 교사 검토 |
| E3 | 실제 Supabase Auth·Realtime이 필요한 교사 흐름 E2E(제출→카드→채점→반환→재제출, 플래그 10초) | DEPLOY.md §5 스테이징 점검 (로컬은 DB 테스트로 같은 규칙 검증) |
| E4 | 실 Claude 응답 회귀 25건(nightly), 첫 토큰 p95·학급당 비용 | API 키 연결 후 `npm test`(키 있으면 실행)·`docs/perf-load.md` 측정 2 |
| E5 | 처리방침·보호자 동의서 문구 | 학교 개인정보 보호책임자 검토 후 확정 |
| E6 | KWCAG 수동 항목(키보드 전 과정·200% 확대·스크린리더) | 파일럿 1주 전 (`docs/kwcag-checklist.md`) |
