-- 0006_teacher.sql — 교사 대시보드: 채점·반환(감사 로그), 마감 조정, 이벤트 무결성, Realtime (plan S7, 지침 1.4·5.1·6.3, R6·R11)
-- 채점 초안(grade_drafts)은 교사만 읽는다. 학생은 "반환"된 뒤에만 submissions.rubric_scores·teacher_feedback을 본다 (SUMMATIVE).

create table public.grade_drafts (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  rubric jsonb not null default '{}',
  feedback text not null default '',
  updated_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);
alter table public.grade_drafts enable row level security;
create policy "grade drafts: teacher" on public.grade_drafts for select to authenticated
  using (submission_id in (select s.id from public.submissions s join public.sessions x on x.id = s.session_id
                           where x.class_id in (select private.my_teaching_class_ids())));

-- 루브릭 형식 검사: 4항목 × high/mid/low
create or replace function private.valid_rubric(r jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(r) = 'object'
     and not exists (
       select 1 from jsonb_each_text(r) as e(k, v)
        where e.k not in ('hypothesis_variables', 'data', 'interpretation', 'reflection')
           or e.v not in ('high', 'mid', 'low'))
$$;

-- 제출물이 이 교사의 반 것인지 확인하고 해당 세션을 돌려준다
create or replace function private.teacher_submission(p_teacher uuid, p_submission uuid) returns public.sessions
language plpgsql stable set search_path = '' as $$
declare v_sess public.sessions;
begin
  select x.* into v_sess from public.submissions s join public.sessions x on x.id = s.session_id where s.id = p_submission;
  if v_sess.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.require_class_teacher(p_teacher, v_sess.class_id);
  return v_sess;
end $$;

-- 채점 초안 저장 (학생에게 보이지 않음)
create or replace function public.app_save_grade_draft(p_teacher uuid, p_submission uuid, p_rubric jsonb, p_feedback text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.teacher_submission(p_teacher, p_submission);
  if not private.valid_rubric(coalesce(p_rubric, '{}')) then raise exception 'invalid_rubric' using errcode = '22023'; end if;
  insert into public.grade_drafts (submission_id, rubric, feedback, updated_by)
  values (p_submission, coalesce(p_rubric, '{}'), left(coalesce(p_feedback, ''), 2000), p_teacher)
  on conflict (submission_id) do update
    set rubric = excluded.rubric, feedback = excluded.feedback, updated_by = excluded.updated_by, updated_at = now();
end $$;

-- 반환: 루브릭 4항목이 모두 있어야 한다. 성적 변경은 grade_audit_log에 남긴다 (CLAUDE.md 규칙 3)
create or replace function public.app_return_submission(p_teacher uuid, p_submission uuid, p_rubric jsonb, p_feedback text, p_reason text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_sub public.submissions; v_sess public.sessions; v_now timestamptz := now();
begin
  v_sess := private.teacher_submission(p_teacher, p_submission);
  select * into v_sub from public.submissions where id = p_submission for update;
  if v_sess.status not in ('submitted', 'resubmitted') then raise exception 'not_submitted' using errcode = 'P0001'; end if;
  if not private.valid_rubric(coalesce(p_rubric, '{}')) or (select count(*) from jsonb_object_keys(p_rubric)) <> 4 then
    raise exception 'invalid_rubric' using errcode = '22023';
  end if;
  insert into public.grade_audit_log (submission_id, actor_id, before, after, reason)
  values (p_submission, p_teacher,
          jsonb_build_object('rubric', v_sub.rubric_scores, 'feedback', v_sub.teacher_feedback, 'version', v_sub.version),
          jsonb_build_object('rubric', p_rubric, 'feedback', p_feedback, 'version', v_sub.version),
          coalesce(nullif(trim(p_reason), ''), case when v_sub.returned_at is null then 'first_return' else 'regrade' end));
  update public.submissions
     set rubric_scores = p_rubric, teacher_feedback = left(coalesce(p_feedback, ''), 2000), returned_at = v_now
   where id = p_submission;
  update public.sessions set status = 'returned', current_step = 'report', updated_at = v_now where id = v_sess.id;
  delete from public.grade_drafts where submission_id = p_submission;
  insert into public.events (session_id, class_id, student_id, event_type, payload)
  values (v_sess.id, v_sess.class_id, v_sess.student_id, 'report_returned', jsonb_build_object('version', v_sub.version, 'guideline', '6.3'));
  return v_now;
end $$;

-- 마감·지각 허용 조정 (T-04)
create or replace function public.app_update_assignment(p_teacher uuid, p_assignment uuid, p_due timestamptz, p_allow_late boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_class uuid;
begin
  select class_id into v_class from public.assignments where id = p_assignment;
  if v_class is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.require_class_teacher(p_teacher, v_class);
  update public.assignments set due_at = p_due, allow_late = coalesce(p_allow_late, allow_late) where id = p_assignment;
end $$;

-- 학생 브라우저가 남길 수 있는 이벤트 종류를 제한한다 (제출·반환·플래그는 서버 함수만 — 위조 방지)
create or replace function public.app_log_events(p_student uuid, p_session uuid, p_events jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v public.sessions; n int;
begin
  select * into v from public.sessions where id = p_session and student_id = p_student;
  if v.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.events (session_id, class_id, student_id, event_type, payload)
  select p_session, v.class_id, p_student, e ->> 'type', coalesce(e -> 'payload', '{}')
  from (select e from jsonb_array_elements(p_events) as e limit 50) x
  where e ->> 'type' in ('block_edit', 'run_completed', 'sim_error_flagged', 'playback_done', 'prediction_made',
                         'prediction_explained', 'calc_checked', 'graph_opened');
  get diagnostics n = row_count;
  return n;
end $$;

-- 세션 시작 이벤트 (체류 시간 계산의 기준점)
create or replace function private.on_session_started() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.events (session_id, class_id, student_id, event_type, payload)
  values (new.id, new.class_id, new.student_id, 'session_started', '{}');
  return new;
end $$;
create trigger session_started after insert on public.sessions
  for each row execute function private.on_session_started();

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('app_save_grade_draft', 'app_return_submission', 'app_update_assignment', 'app_log_events') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
revoke all on function private.valid_rubric(jsonb), private.teacher_submission(uuid, uuid), private.on_session_started() from public, anon, authenticated;

-- Realtime: 교사 대시보드만 구독한다 (RLS가 적용되므로 학생은 events를 받지 못한다)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.events, public.submissions;
  end if;
end $$;
