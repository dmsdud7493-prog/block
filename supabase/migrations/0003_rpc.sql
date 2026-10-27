-- 0003_rpc.sql — 서버 전용 쓰기 함수 (ADR-P03·P07)
-- Route Handler가 getClaims()로 사용자를 확인한 뒤 service_role로 호출한다. 교육적 게이트는 여기서 강제한다:
--   start_session: consent_required (R1)   begin_run/record_run: prediction_required (지침 3.1)
--   save_program 등: session_locked (제출 후 잠금, 반환되면 다시 열림)

create or replace function private.random_join_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6)
$$;

create or replace function private.require_teacher(p_user uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = p_user and role in ('teacher', 'admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

create or replace function private.require_class_teacher(p_user uuid, p_class uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if not exists (select 1 from public.classes where id = p_class and teacher_id = p_user) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

-- 학생 본인 세션 + 편집 가능 상태 확인
create or replace function private.editable_session(p_student uuid, p_session uuid) returns public.sessions
language plpgsql stable set search_path = '' as $$
declare v public.sessions;
begin
  select * into v from public.sessions where id = p_session;
  if v.id is null or v.student_id <> p_student then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status not in ('in_progress', 'returned') then
    raise exception 'session_locked' using errcode = 'P0001';
  end if;
  return v;
end $$;

create or replace function public.app_create_class(p_teacher uuid, p_name text) returns public.classes
language plpgsql security definer set search_path = '' as $$
declare v public.classes; v_code text;
begin
  perform private.require_teacher(p_teacher);
  loop
    v_code := private.random_join_code();
    exit when not exists (select 1 from public.classes where join_code = v_code);
  end loop;
  insert into public.classes (teacher_id, name, join_code) values (p_teacher, p_name, v_code) returning * into v;
  return v;
end $$;

create or replace function public.app_enroll_student(p_teacher uuid, p_class uuid, p_student uuid, p_student_no text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_class_teacher(p_teacher, p_class);
  insert into public.enrollments (class_id, student_id, student_no) values (p_class, p_student, p_student_no);
end $$;

create or replace function public.app_set_consent(p_teacher uuid, p_student uuid, p_on_file boolean, p_date date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.enrollments e join public.classes c on c.id = e.class_id
    where e.student_id = p_student and c.teacher_id = p_teacher
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.profiles set consent_on_file = p_on_file, consent_date = case when p_on_file then coalesce(p_date, current_date) end
  where id = p_student;
end $$;

create or replace function public.app_update_class_settings(p_teacher uuid, p_class uuid, p_settings jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_class_teacher(p_teacher, p_class);
  update public.classes set settings = settings || p_settings where id = p_class;
end $$;

create or replace function public.app_assign(p_teacher uuid, p_class uuid, p_slug text, p_due timestamptz, p_allow_late boolean, p_settings jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_exp uuid; v_id uuid;
begin
  perform private.require_class_teacher(p_teacher, p_class);
  select id into v_exp from public.experiments where slug = p_slug and is_published;
  if v_exp is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.assignments (class_id, experiment_id, due_at, allow_late, settings_override)
  values (p_class, v_exp, p_due, coalesce(p_allow_late, true), coalesce(p_settings, '{}')) returning id into v_id;
  return v_id;
end $$;

-- 학생 스스로 반 참여 (반 코드) — 교사가 계정을 만들어 주는 기본 흐름 외 보조 경로
create or replace function public.app_join_class(p_student uuid, p_code text, p_student_no text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_class uuid;
begin
  select id into v_class from public.classes where join_code = upper(p_code);
  if v_class is null then raise exception 'invalid_join_code' using errcode = 'P0002'; end if;
  insert into public.enrollments (class_id, student_id, student_no) values (v_class, p_student, p_student_no)
  on conflict (class_id, student_id) do nothing;
  return v_class;
end $$;

create or replace function public.app_start_session(p_student uuid, p_assignment uuid) returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare v public.sessions; a public.assignments;
begin
  select * into a from public.assignments where id = p_assignment;
  if a.id is null or not exists (select 1 from public.enrollments where class_id = a.class_id and student_id = p_student) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not (select consent_on_file from public.profiles where id = p_student) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  select * into v from public.sessions where student_id = p_student and assignment_id = p_assignment;
  if v.id is not null then return v; end if;
  insert into public.sessions (student_id, class_id, experiment_id, assignment_id, seed)
  values (p_student, a.class_id, a.experiment_id, a.id, encode(extensions.gen_random_bytes(12), 'hex'))
  returning * into v;
  insert into public.reports (session_id) values (v.id);
  return v;
end $$;

create or replace function public.app_save_program(p_student uuid, p_session uuid, p_program jsonb, p_blockly jsonb, p_inquiry jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare v_next int;
begin
  perform private.editable_session(p_student, p_session);
  select coalesce(max(version), 0) + 1 into v_next from public.block_programs where session_id = p_session;
  insert into public.block_programs (session_id, version, program, blockly) values (p_session, v_next, p_program, p_blockly);
  update public.sessions set updated_at = now(), inquiry = coalesce(p_inquiry, inquiry) where id = p_session;
  return v_next;
end $$;

create or replace function public.app_upsert_prediction(p_student uuid, p_session uuid, p_target text, p_choice text, p_rationale text, p_hints int, p_run_no int)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint; v_run uuid;
begin
  perform private.editable_session(p_student, p_session);
  if char_length(coalesce(p_rationale, '')) < 5 then raise exception 'invalid_input' using errcode = '22023'; end if;
  select id into v_run from public.runs where session_id = p_session and run_no = p_run_no;
  insert into public.predictions (session_id, run_id, target, choice, rationale, hints_used)
  values (p_session, v_run, p_target, p_choice, p_rationale, coalesce(p_hints, 0))
  on conflict (session_id, target) do update
    set choice = excluded.choice, rationale = excluded.rationale, hints_used = greatest(public.predictions.hints_used, excluded.hints_used), updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.app_explain_prediction(p_student uuid, p_session uuid, p_target text, p_matched boolean, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.editable_session(p_student, p_session);
  if char_length(coalesce(p_text, '')) < 5 then raise exception 'invalid_input' using errcode = '22023'; end if;
  update public.predictions set matched = p_matched, rationale_after = p_text, updated_at = now()
  where session_id = p_session and target = p_target;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

-- 실행 전 확인: 예측 게이트(지침 3.1) + 시드·다음 회차 반환
create or replace function public.app_begin_run(p_student uuid, p_session uuid)
returns table (seed text, slug text, next_run_no int, program_version int, max_runs int)
language plpgsql security definer set search_path = '' as $$
declare v public.sessions;
begin
  v := private.editable_session(p_student, p_session);
  if not exists (select 1 from public.predictions where session_id = p_session) then
    raise exception 'prediction_required' using errcode = 'P0001';
  end if;
  return query
    select v.seed, e.slug,
      (select coalesce(max(r.run_no), 0) + 1 from public.runs r where r.session_id = p_session),
      (select coalesce(max(b.version), 0) from public.block_programs b where b.session_id = p_session),
      (select (c.settings ->> 'max_runs')::int from public.classes c where c.id = v.class_id)
    from public.experiments e where e.id = v.experiment_id;
end $$;

create or replace function public.app_record_run(
  p_student uuid, p_session uuid, p_run_no int, p_program_version int, p_program jsonb, p_seed text, p_ok boolean,
  p_diagnostics jsonb, p_measurements jsonb, p_calc jsonb, p_series jsonb, p_changed text[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.editable_session(p_student, p_session);
  if not exists (select 1 from public.predictions where session_id = p_session) then
    raise exception 'prediction_required' using errcode = 'P0001';
  end if;
  insert into public.runs (session_id, run_no, program_version, program, seed, ok, diagnostics, measurements, calc_requests, series, changed_vars)
  values (p_session, p_run_no, p_program_version, p_program, p_seed, p_ok, p_diagnostics, p_measurements, p_calc, p_series, coalesce(p_changed, '{}'))
  returning id into v_id;
  update public.sessions set current_step = case when p_ok then 'interpret' else 'design' end, updated_at = now() where id = p_session;
  return v_id;
end $$;

create or replace function public.app_record_check(
  p_student uuid, p_session uuid, p_run_no int, p_key text, p_value numeric, p_unit text, p_correct boolean, p_error text
) returns int language plpgsql security definer set search_path = '' as $$
declare v_run uuid; v_attempt int;
begin
  perform private.editable_session(p_student, p_session);
  select id into v_run from public.runs where session_id = p_session and run_no = p_run_no;
  if v_run is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  select coalesce(max(attempt), 0) + 1 into v_attempt from public.measurements where session_id = p_session and key = p_key;
  insert into public.measurements (session_id, run_id, key, value, unit, is_correct, error_type, attempt)
  values (p_session, v_run, p_key, p_value, p_unit, p_correct, p_error, v_attempt);
  return v_attempt;
end $$;

create or replace function public.app_log_events(p_student uuid, p_session uuid, p_events jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v public.sessions; n int;
begin
  select * into v from public.sessions where id = p_session and student_id = p_student;
  if v.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.events (session_id, class_id, student_id, event_type, payload)
  select p_session, v.class_id, p_student, left(e ->> 'type', 40), coalesce(e -> 'payload', '{}')
  from jsonb_array_elements(p_events) as e
  limit 50;
  get diagnostics n = row_count;
  return n;
end $$;

-- 사용자 JWT에 역할 클레임 추가 (Supabase Custom Access Token Hook)
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_role text;
begin
  select role::text into v_role from public.profiles where id = (event ->> 'user_id')::uuid;
  return jsonb_set(event, '{claims,user_role}', to_jsonb(coalesce(v_role, 'student')));
end $$;

-- 권한: app_* 함수는 서버(service_role)만, 훅은 supabase_auth_admin만
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'app\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
create policy "auth admin reads roles" on public.profiles for select to supabase_auth_admin using (true);
