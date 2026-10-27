-- 0002_rls.sql — 행 수준 보안 (research.md §7 패턴: (select auth.uid()), to authenticated, private 헬퍼로 재귀 차단)
-- 학생: 자기 행만 읽기. 교사: 자기 반 학생 행 읽기. 쓰기 정책은 두지 않는다 → 모든 쓰기는 서버 함수(0003)로만 (ADR-P07).

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.my_teaching_class_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.classes where teacher_id = (select auth.uid())
$$;

create or replace function private.my_class_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select class_id from public.enrollments where student_id = (select auth.uid())
  union
  select id from public.classes where teacher_id = (select auth.uid())
$$;

create or replace function private.my_session_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.sessions where student_id = (select auth.uid())
  union
  select s.id from public.sessions s where s.class_id in (select private.my_teaching_class_ids())
$$;

create or replace function private.my_student_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.student_id from public.enrollments e where e.class_id in (select private.my_teaching_class_ids())
$$;

revoke all on function private.my_teaching_class_ids(), private.my_class_ids(), private.my_session_ids(), private.my_student_ids() from public, anon;
grant execute on function private.my_teaching_class_ids(), private.my_class_ids(), private.my_session_ids(), private.my_student_ids() to authenticated;

-- 모든 테이블 RLS 켜기
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.experiments enable row level security;
alter table public.assignments enable row level security;
alter table public.sessions enable row level security;
alter table public.block_programs enable row level security;
alter table public.runs enable row level security;
alter table public.measurements enable row level security;
alter table public.predictions enable row level security;
alter table public.reports enable row level security;
alter table public.submissions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.events enable row level security;
alter table public.grade_audit_log enable row level security;

-- 쓰기 권한 회수 (authenticated·anon은 읽기만)
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;

create policy "profiles: self" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: teacher reads own students" on public.profiles for select to authenticated
  using (id in (select private.my_student_ids()));

create policy "classes: member or teacher" on public.classes for select to authenticated
  using (id in (select private.my_class_ids()));

create policy "enrollments: self" on public.enrollments for select to authenticated
  using (student_id = (select auth.uid()));
create policy "enrollments: teacher" on public.enrollments for select to authenticated
  using (class_id in (select private.my_teaching_class_ids()));

-- 실험 목록은 누구나(로그인) 보되 spec(서버 전용) 열은 권한 없음
create policy "experiments: published" on public.experiments for select to authenticated
  using (is_published);
revoke select on public.experiments from authenticated;
grant select (id, slug, title, standards, is_published) on public.experiments to authenticated;

create policy "assignments: class members" on public.assignments for select to authenticated
  using (class_id in (select private.my_class_ids()));

create policy "sessions: own" on public.sessions for select to authenticated
  using (student_id = (select auth.uid()));
create policy "sessions: teacher" on public.sessions for select to authenticated
  using (class_id in (select private.my_teaching_class_ids()));

create policy "block_programs: session" on public.block_programs for select to authenticated
  using (session_id in (select private.my_session_ids()));
create policy "runs: session" on public.runs for select to authenticated
  using (session_id in (select private.my_session_ids()));
create policy "measurements: session" on public.measurements for select to authenticated
  using (session_id in (select private.my_session_ids()));
create policy "predictions: session" on public.predictions for select to authenticated
  using (session_id in (select private.my_session_ids()));
create policy "reports: session" on public.reports for select to authenticated
  using (session_id in (select private.my_session_ids()));
create policy "submissions: session" on public.submissions for select to authenticated
  using (session_id in (select private.my_session_ids()));
create policy "chat: session" on public.chat_messages for select to authenticated
  using (session_id in (select private.my_session_ids()));
create policy "events: teacher only" on public.events for select to authenticated
  using (class_id in (select private.my_teaching_class_ids()));
create policy "audit: teacher" on public.grade_audit_log for select to authenticated
  using (submission_id in (select id from public.submissions where session_id in (select private.my_session_ids())) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('teacher', 'admin')));
