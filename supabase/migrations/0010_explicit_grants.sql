-- 0010_explicit_grants.sql — 새 Supabase 프로젝트는 "Automatically expose new tables"가 기본으로 꺼져 있다.
-- 기본 권한에 기대지 않고 필요한 권한을 명시한다: 로그인 사용자는 읽기만(RLS가 행을 거른다), 쓰기는 service_role 서버 함수로만.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on all tables in schema public from anon;
-- 실험 명세(spec)는 서버 전용 — 공개 열만
revoke select on public.experiments from authenticated;
grant select (id, slug, title, standards, is_published) on public.experiments to authenticated;
