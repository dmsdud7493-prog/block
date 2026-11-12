-- 0012: 고쳐서 다시 내기는 한 번만, 교사가 "끝내기"와 "한 번 더 고치게 돌려주기"를 고른다 (ADR-P25)
-- 끝내기: 세션은 submitted/resubmitted 그대로(학생은 고칠 수 없음), submissions.returned_at·루브릭·코멘트만 공개.
-- 고치게 돌려주기: 지금처럼 returned. 단 2번째 제출(이미 한 번 고쳐 낸 것)은 다시 돌려줄 수 없다.

create or replace function public.app_submit_report(p_student uuid, p_session uuid)
returns table (submission_id uuid, late boolean, version int)
language plpgsql security definer set search_path = '' as $$
declare v public.sessions; r public.reports; a public.assignments; v_late boolean; v_sub public.submissions; v_prev int;
begin
  v := private.editable_session(p_student, p_session);
  -- 고쳐서 다시 내기는 한 번만(2번째 제출까지)
  select s.version into v_prev from public.submissions s where s.session_id = p_session;
  if coalesce(v_prev, 0) >= 2 then
    raise exception 'revision_limit' using errcode = 'P0001';
  end if;
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

drop function if exists public.app_return_submission(uuid, uuid, jsonb, text, text);
create function public.app_return_submission(p_teacher uuid, p_submission uuid, p_rubric jsonb, p_feedback text, p_reason text, p_allow_revision boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_sub public.submissions; v_sess public.sessions; v_now timestamptz := now();
begin
  v_sess := private.teacher_submission(p_teacher, p_submission);
  select * into v_sess from public.sessions where id = v_sess.id for update;
  select * into v_sub from public.submissions where id = p_submission for update;
  if v_sess.status not in ('submitted', 'resubmitted') then raise exception 'not_submitted' using errcode = 'P0001'; end if;
  -- 한 번 고쳐 낸 보고서(2번째 제출)는 다시 돌려줄 수 없다 — 채점만 확정한다
  if p_allow_revision and v_sub.version >= 2 then raise exception 'revision_limit' using errcode = 'P0001'; end if;
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
  -- 고치게 돌려주면 returned(학생이 고칠 수 있음), 끝내면 제출 상태 그대로 둔 채 채점만 공개(returned_at)
  update public.sessions set status = case when p_allow_revision then 'returned'::public.session_status else v_sess.status end, current_step = 'report', updated_at = v_now where id = v_sess.id;
  delete from public.grade_drafts where submission_id = p_submission;
  perform private.emit(v_sess.id, 'report_returned', jsonb_build_object('version', v_sub.version, 'final', not p_allow_revision, 'guideline', '6.3'));
  return v_now;
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('app_submit_report', 'app_return_submission') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
