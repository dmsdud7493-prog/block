# progress.md — 물질의 특성 가상실험실

> AI 에이전트는 작업 시작 전 이 파일을 읽고, 작업 완료 후 반드시 업데이트합니다.
> 마지막 업데이트: 2026-10-27

---

## 컨텍스트 앵커

| 필드 | 내용 |
|---|---|
| intent | docs/plan.md Sprint 0~9 순서대로 구현 |
| changes_made | S0: 하네스 템플릿 적용, CLAUDE.md·architecture.md 프로젝트화, 읽기 전용 에이전트 tools, Stop hook·권한 규칙, verify.sh 프로젝트 검사(P1~P8)·xargs 버그 수정, vercel.json(icn1), CI, 테스트 러너 |
| decisions_taken | ADR-P01~P06 (docs/decision-log.md) |
| next_steps | S1 공통 엔진 |

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
| 8 | 실험 5종 확장 | ⬜ |
| 9 | 컴플라이언스·접근성·성능·배포 준비 | ⬜ |

---

## 알려진 이슈 / 외부 의존

| # | 내용 | 해소 방법 |
|---|---|---|
| E1 | GitHub 리포 생성·푸시, Supabase 프로젝트(서울), Vercel 연결, Anthropic API 키는 사용자 계정 인증 필요 | `DEPLOY.md` 단계별 실행 |
| E2 | plan.md §8.2 미확인 사항(고시문 원문 대조, 교과서 수치, 루브릭 문구) | 교사 검토 |
