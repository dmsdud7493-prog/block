# S9 — 컴플라이언스·접근성·성능·배포 준비 (R1~R14, plan §6·§7)
구현: /privacy(국외 이전: 법적 근거·항목·국가·시기·방법·받는 자·목적·보유 기간·거부 방법과 효과 — Supabase·Vercel·Anthropic; 교사 열람 정책),
/netcheck + /api/health(비밀 값 비노출), 0008_compliance.sql(app_delete_student·app_delete_class cascade, private.purge_inactive_students,
llm_prices + v_llm_usage_daily, v_guideline_metrics — 모두 security_invoker로 RLS 적용), 학생/반 삭제 UI(DangerButton·ClassDangerZone, 브라우저 확인 창 없이 2단계),
튜터 meta에 모델 이름 기록, 모달 포커스 가둠·복귀, 부하 스크립트(scripts/load/classroom.mjs), CI E2E 빌드 env 수정
문서: README.md, DEPLOY.md, docs/kwcag-checklist.md, consent-letter.md, pilot-checklist.md, perf-load.md, design-principles-impl.md(24지침 ✅), compliance-checklist.md(R1~R14 ✅)
수용 기준: consent_required 403 ✓(DB·라우트) / 처리방침 항목·AI 고지 ✓(E2E) / 프롬프트 실명·학교 0건 ✓(state-safety) / axe 10페이지·jest-axe 0건 ✓ /
삭제 cascade 8테이블 ✓(DB) / 30명 로컬 부하 오류 0%, run p95 8 ms·tutor(규칙) p95 10 ms ✓ — Claude·Supabase 연결 상태 p95·비용은 스테이징에서(E3·E4)
Anthropic 보존 기간 문구 근거: privacy.claude.com "How long do you store my organization's data" (입력·출력 30일 내 삭제, 정책 위반 판정 시 최대 2년)
