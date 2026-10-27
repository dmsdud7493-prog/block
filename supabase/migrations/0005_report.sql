-- 0005_report.sql — 탐구 보고서 저장·제출 (지침 6.1~6.4, 요구사항 11·12·14)
-- 제출 게이트: 가설 판단·근거·오차·개선안 + 성찰 4문항 중 3개 이상(10자 이상) → 아니면 reflection_required
-- 마감: allow_late=false이고 마감이 지났으면 late_not_allowed, 허용이면 late=true

create or replace function public.app_save_report(p_student uuid, p_session uuid, p_content jsonb, p_ai text[])
returns int language plpgsql security definer set search_path = '' as $$
declare v_version int;
begin
  perform private.editable_session(p_student, p_session);
  update public.reports
     set content = p_content, ai_assisted_sections = coalesce(p_ai, '{}'), version = version + 1, updated_at = now()
   where session_id = p_session
  returning version into v_version;
  if v_version is null then
    insert into public.reports (session_id, content, ai_assisted_sections) values (p_session, p_content, coalesce(p_ai, '{}'))
    returning version into v_version;
  end if;
  return v_version;
end $$;

create or replace function private.report_ready(c jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(c #>> '{interpretation,hypothesisVerdict}', '') in ('supported', 'rejected', 'unclear')
     and char_length(trim(coalesce(c #>> '{interpretation,evidence}', ''))) >= 5
     and char_length(trim(coalesce(c #>> '{interpretation,errorSources}', ''))) >= 5
     and char_length(trim(coalesce(c #>> '{interpretation,improvements}', ''))) >= 5
     and (
       (case when char_length(trim(coalesce(c #>> '{reflection,diff}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,hardest}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,curious}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,realLife}', ''))) >= 10 then 1 else 0 end)
     ) >= 3
$$;

create or replace function public.app_submit_report(p_student uuid, p_session uuid)
returns table (submission_id uuid, late boolean, version int)
language plpgsql security definer set search_path = '' as $$
declare v public.sessions; r public.reports; a public.assignments; v_late boolean; v_sub public.submissions;
begin
  v := private.editable_session(p_student, p_session);
  select * into r from public.reports where session_id = p_session;
  if r.session_id is null or not private.report_ready(r.content) then
    raise exception 'reflection_required' using errcode = 'P0001';
  end if;
  select * into a from public.assignments where id = v.assignment_id;
  v_late := a.due_at is not null and now() > a.due_at;
  if v_late and not a.allow_late then
    raise exception 'late_not_allowed' using errcode = 'P0001';
  end if;
  insert into public.submissions (session_id, late, report_snapshot)
  values (p_session, v_late, jsonb_build_object('content', r.content, 'ai_assisted_sections', to_jsonb(r.ai_assisted_sections), 'report_version', r.version))
  on conflict (session_id) do update
    set submitted_at = now(), late = excluded.late, report_snapshot = excluded.report_snapshot,
        version = public.submissions.version + 1
  returning * into v_sub;
  update public.sessions
     set status = case when v.status = 'returned' then 'resubmitted'::public.session_status else 'submitted'::public.session_status end,
         submitted_at = now(), current_step = 'report', updated_at = now()
   where id = p_session;
  insert into public.events (session_id, class_id, student_id, event_type, payload)
  values (p_session, v.class_id, p_student, case when v.status = 'returned' then 'report_resubmitted' else 'report_submitted' end,
          jsonb_build_object('late', v_late, 'version', v_sub.version, 'guideline', '6.4'));
  return query select v_sub.id, v_late, v_sub.version;
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('app_save_report', 'app_submit_report') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
revoke all on function private.report_ready(jsonb) from public, anon, authenticated;
