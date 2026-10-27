-- 0009_hardening.sql — S7~S9 보안 검토 반영
-- 1) 삭제·등록은 학생 계정만 2) 삭제 검사-실행 원자성(행 잠금) 3) 진행 이벤트는 서버가 기록·클라이언트 이벤트 크기 제한
-- 4) 반환 이중 클릭 방지 5) 새 테이블·뷰 기본 권한 닫기 6) 재제출 시 이전 반환 표시 정리 7) 단가·비용은 교사만

-- ── 1·2 학생 계정만, 행 잠금 ─────────────────────────────────────
create or replace function private.lock_student(p_student uuid) returns void
language plpgsql set search_path = '' as $$
begin
  perform 1 from public.profiles where id = p_student and role = 'student' for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
end $$;

create or replace function public.app_enroll_student(p_teacher uuid, p_class uuid, p_student uuid, p_student_no text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_class_teacher(p_teacher, p_class);
  perform private.lock_student(p_student);
  insert into public.enrollments (class_id, student_id, student_no) values (p_class, p_student, p_student_no);
end $$;

create or replace function public.app_join_class(p_student uuid, p_code text, p_student_no text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_class uuid;
begin
  perform private.lock_student(p_student);
  select id into v_class from public.classes where join_code = upper(p_code);
  if v_class is null then raise exception 'invalid_join_code' using errcode = 'P0002'; end if;
  insert into public.enrollments (class_id, student_id, student_no) values (v_class, p_student, p_student_no)
  on conflict (class_id, student_id) do nothing;
  return v_class;
end $$;

create or replace function public.app_delete_student(p_teacher uuid, p_student uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_sessions int;
begin
  perform private.require_teacher(p_teacher);
  perform private.lock_student(p_student);
  if not exists (select 1 from public.enrollments e join public.classes c on c.id = e.class_id
                  where e.student_id = p_student and c.teacher_id = p_teacher)
     or exists (select 1 from public.enrollments e join public.classes c on c.id = e.class_id
                 where e.student_id = p_student and c.teacher_id <> p_teacher) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select count(*) into v_sessions from public.sessions where student_id = p_student;
  delete from auth.users where id = p_student;
  return v_sessions;
end $$;

create or replace function public.app_delete_class(p_teacher uuid, p_class uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_students uuid[]; v_n int;
begin
  perform private.require_class_teacher(p_teacher, p_class);
  -- 이 반 학생 행을 잠가 검사와 삭제 사이에 다른 반 등록이 끼어들지 못하게 한다
  perform 1 from public.profiles p join public.enrollments e on e.student_id = p.id
   where e.class_id = p_class and p.role = 'student' for update of p;
  select coalesce(array_agg(e.student_id), '{}') into v_students
    from public.enrollments e join public.profiles p on p.id = e.student_id
   where e.class_id = p_class and p.role = 'student'
     and not exists (select 1 from public.enrollments o where o.student_id = e.student_id and o.class_id <> p_class);
  delete from public.classes where id = p_class;
  delete from auth.users where id = any(v_students);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ── 3 진행 이벤트는 서버 기록에서 자동 생성 (학생 브라우저가 위조할 수 없다) ──
create or replace function private.emit(p_session uuid, p_type text, p_payload jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.events (session_id, class_id, student_id, event_type, payload)
  select s.id, s.class_id, s.student_id, p_type, p_payload from public.sessions s where s.id = p_session
$$;

create or replace function private.on_run() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_err jsonb;
begin
  select d into v_err from jsonb_array_elements(coalesce(new.diagnostics, '[]')) d where d ->> 'severity' = 'error' limit 1;
  perform private.emit(new.session_id, case when new.ok then 'run_completed' else 'sim_error_flagged' end,
    jsonb_build_object('runNo', new.run_no, 'guideline', '3.2', 'message', v_err ->> 'message',
      'codes', coalesce((select jsonb_agg(d ->> 'code') from jsonb_array_elements(coalesce(new.diagnostics, '[]')) d), '[]')));
  return new;
end $$;
create trigger run_event after insert on public.runs for each row execute function private.on_run();

create or replace function private.on_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_student_input then
    perform private.emit(new.session_id, 'calc_checked',
      jsonb_build_object('key', new.key, 'correct', new.is_correct, 'errorType', new.error_type, 'attempt', new.attempt, 'guideline', '5.3'));
  end if;
  return new;
end $$;
create trigger check_event after insert on public.measurements for each row execute function private.on_check();

create or replace function private.on_prediction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.choice is distinct from old.choice or new.rationale is distinct from old.rationale then
    perform private.emit(new.session_id, 'prediction_made',
      jsonb_build_object('target', new.target, 'hintsUsed', new.hints_used, 'guideline', '3.1'));
  end if;
  if tg_op = 'UPDATE' and new.matched is not null and new.matched is distinct from old.matched then
    perform private.emit(new.session_id, 'prediction_explained', jsonb_build_object('target', new.target, 'matched', new.matched, 'guideline', '3.3'));
  end if;
  return new;
end $$;
create trigger prediction_event after insert or update on public.predictions for each row execute function private.on_prediction();

-- 브라우저 이벤트는 화면 조작 3종만, payload 2 KB 이하
create or replace function public.app_log_events(p_student uuid, p_session uuid, p_events jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v public.sessions; n int;
begin
  select * into v from public.sessions where id = p_session and student_id = p_student;
  if v.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.events (session_id, class_id, student_id, event_type, payload)
  select p_session, v.class_id, p_student, e ->> 'type', coalesce(e -> 'payload', '{}')
  from (select e from jsonb_array_elements(p_events) as e limit 50) x
  where e ->> 'type' in ('block_edit', 'playback_done', 'graph_opened')
    and pg_column_size(coalesce(e -> 'payload', '{}')) <= 2048;
  get diagnostics n = row_count;
  return n;
end $$;

-- ── 4 반환 이중 클릭: 세션을 잠근 뒤 상태 확인 ─────────────────────
create or replace function public.app_return_submission(p_teacher uuid, p_submission uuid, p_rubric jsonb, p_feedback text, p_reason text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_sub public.submissions; v_sess public.sessions; v_now timestamptz := now();
begin
  v_sess := private.teacher_submission(p_teacher, p_submission);
  select * into v_sess from public.sessions where id = v_sess.id for update;
  select * into v_sub from public.submissions where id = p_submission for update;
  if v_sess.status not in ('submitted', 'resubmitted') then raise exception 'not_submitted' using errcode = 'P0001'; end if;
  if not private.valid_rubric(coalesce(p_rubric, '{}')) or (select count(*) from jsonb_object_keys(p_rubric)) <> 4 then
    raise exception 'invalid_rubric' using errcode = '22023';
  end if;
  insert into public.grade_audit_log (submission_id, actor_id, before, after, reason)
  values (p_submission, p_teacher,
          jsonb_build_object('rubric', v_sub.rubric_scores, 'feedback', v_sub.teacher_feedback, 'version', v_sub.version),
          jsonb_build_object('rubric', p_rubric, 'feedback', p_feedback, 'version', v_sub.version),
          coalesce(nullif(trim(p_reason), ''), case when exists (select 1 from public.grade_audit_log g where g.submission_id = p_submission) then 'regrade' else 'first_return' end));
  update public.submissions
     set rubric_scores = p_rubric, teacher_feedback = left(coalesce(p_feedback, ''), 2000), returned_at = v_now
   where id = p_submission;
  update public.sessions set status = 'returned', current_step = 'report', updated_at = v_now where id = v_sess.id;
  delete from public.grade_drafts where submission_id = p_submission;
  perform private.emit(v_sess.id, 'report_returned', jsonb_build_object('version', v_sub.version, 'guideline', '6.3'));
  return v_now;
end $$;

-- ── 6 재제출하면 "반환됨" 표시를 지운다 (이전 루브릭은 감사 로그에 남아 있다) ──
create or replace function private.on_resubmit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.version > old.version then
    new.returned_at := null;
    new.rubric_scores := null;
    new.teacher_feedback := null;
  end if;
  return new;
end $$;
create trigger resubmit_clear before update on public.submissions for each row execute function private.on_resubmit();

-- ── 5 기본 권한 닫기 ─────────────────────────────────────────────
revoke all on public.grade_drafts, public.llm_prices, public.v_llm_usage_daily, public.v_guideline_metrics from anon, authenticated;
grant select on public.grade_drafts to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'postgres') then
    execute 'alter default privileges in schema public revoke all on tables from anon, authenticated';
  end if;
end $$;

-- ── 7 단가·비용·지표는 교사·관리자만 ────────────────────────────────
create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('teacher', 'admin'))
$$;
grant execute on function private.is_staff() to authenticated;
drop policy "prices: signed in" on public.llm_prices;
create policy "prices: staff" on public.llm_prices for select to authenticated using (private.is_staff());
grant select on public.llm_prices to authenticated;

-- 뷰는 security_invoker라 학생은 자기 행만 보며, 단가 정책 때문에 학생에게는 비용이 null로 보인다
grant select on public.v_llm_usage_daily, public.v_guideline_metrics to authenticated;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('app_enroll_student', 'app_join_class', 'app_delete_student', 'app_delete_class', 'app_log_events', 'app_return_submission') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
revoke all on function private.lock_student(uuid), private.emit(uuid, text, jsonb), private.on_run(), private.on_check(),
  private.on_prediction(), private.on_resubmit() from public, anon, authenticated;
