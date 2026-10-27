# S3 — Auth·스키마·RLS·학급·세션 저장 (지침 1.4·3.4·4.4, R1·R2·R9·R12)
BUILD: supabase/migrations/0001_init.sql(15 테이블)·0002_rls.sql·0003_rpc.sql, seed.sql, tests/db/auth-shim.sql·helpers·gates.test(18),
lib/supabase/{env,server,admin,client}, proxy.ts, lib/server/{auth,route,rpc,sessions,hydrate,students,teacher,labService,schemas},
api/session/{start,program}, api/{run,check,predict,events}, api/class/{create,students,consent,pin,assign,settings},
(auth)/login(actions·폼·AI 고지 확인), lab(S-01)·lab/[sessionId], dashboard(layout·classes·[classId]) + teacher 컴포넌트
수용 기준: RLS 교차 조회 0행 ✓ / join_class 오류·정상 ✓ / profiles에 email·실명 없음 ✓ / run_no·version 누적 ✓ / getSession() 0건 ✓ /
학생 직접 쓰기·app_* 직접 호출 거부 ✓ / experiments.spec 열 거부 ✓ / 동의 없으면 consent_required ✓ / 제출 후 session_locked ✓
미검증(외부 계정 필요): 실제 Supabase Auth 로그인·Realtime — DEPLOY.md 점검 목록으로 이관
