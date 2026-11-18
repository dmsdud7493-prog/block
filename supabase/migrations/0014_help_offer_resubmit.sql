-- 0014 (2026-11-18 실사이트 점검 반영)
-- 1) 교사 "도와줄까?" — 막힌 학생 화면에 말풍선을 띄우고 학생이 "예/아니요"로 답한다 (help_offers)
-- 2) 고쳐서 다시 낸 보고서: 처음 낸 보고서를 previous_snapshot에 남겨 교사가 고친 칸을 볼 수 있게 한다
-- 3) "한 번 더 고치게 돌려주기"는 루브릭을 다 고르지 않아도(코멘트만으로도) 할 수 있다. 확정(끝내기)은 4항목 그대로
-- 되돌리기: help_offers 표·함수를 지우고, 0012의 app_return_submission·0009의 on_resubmit을 다시 적용한다.

-- ── 1 도와줄까? ────────────────────────────────────────────────
create table if not exists public.help_offers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  answer text check (answer in ('yes', 'no')),
  answered_at timestamptz
);
create index if not exists help_offers_session on public.help_offers (session_id, created_at desc);
alter table public.help_offers enable row level security;
create policy "help_offers: session or teacher" on public.help_offers for select to authenticated
  using (session_id in (select private.my_session_ids()));
revoke all on public.help_offers from anon;
grant select on public.help_offers to authenticated;

-- 교사가 자기 반 학생에게 묻는다. 답을 기다리는 물음이 있으면 새로 만들지 않고 그것을 돌려준다
create or replace function public.app_offer_help(p_teacher uuid, p_session uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.sessions; v_id uuid;
begin
  select * into v from public.sessions where id = p_session;
  if v.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.require_class_teacher(p_teacher, v.class_id);
  select h.id into v_id from public.help_offers h
   where h.session_id = p_session and h.answer is null and h.created_at > now() - interval '10 minutes'
   order by h.created_at desc limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.help_offers (session_id, class_id, teacher_id) values (p_session, v.class_id, p_teacher) returning id into v_id;
  perform private.emit(p_session, 'help_offered', jsonb_build_object('offerId', v_id, 'guideline', '4.3'));
  return v_id;
end $$;

-- 학생이 자기 세션의 물음에 한 번 답한다
create or replace function public.app_answer_help(p_student uuid, p_offer uuid, p_answer text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.help_offers; v public.sessions;
begin
  if p_answer not in ('yes', 'no') then raise exception 'invalid_answer' using errcode = '22023'; end if;
  select * into h from public.help_offers where id = p_offer for update;
  if h.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v from public.sessions where id = h.session_id;
  if v.student_id <> p_student then raise exception 'forbidden' using errcode = '42501'; end if;
  if h.answer is not null then return; end if;
  update public.help_offers set answer = p_answer, answered_at = now() where id = p_offer;
  perform private.emit(h.session_id, 'help_answered', jsonb_build_object('offerId', p_offer, 'answer', p_answer, 'guideline', '4.3'));
end $$;

-- ── 2 처음 낸 보고서를 남긴다 ─────────────────────────────────────
alter table public.submissions add column if not exists previous_snapshot jsonb;

create or replace function private.on_resubmit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.version > old.version then
    new.previous_snapshot := old.report_snapshot;
    new.returned_at := null;
    new.rubric_scores := null;
    new.teacher_feedback := null;
  end if;
  return new;
end $$;

-- ── 3 돌려주기는 루브릭 일부(또는 없이)도 된다 ───────────────────────
drop function if exists public.app_return_submission(uuid, uuid, jsonb, text, text, boolean);
create function public.app_return_submission(p_teacher uuid, p_submission uuid, p_rubric jsonb, p_feedback text, p_reason text, p_allow_revision boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_sub public.submissions; v_sess public.sessions; v_now timestamptz := now(); v_n int;
begin
  v_sess := private.teacher_submission(p_teacher, p_submission);
  select * into v_sess from public.sessions where id = v_sess.id for update;
  select * into v_sub from public.submissions where id = p_submission for update;
  if v_sess.status not in ('submitted', 'resubmitted') then raise exception 'not_submitted' using errcode = 'P0001'; end if;
  if p_allow_revision and v_sub.version >= 2 then raise exception 'revision_limit' using errcode = 'P0001'; end if;
  if not private.valid_rubric(coalesce(p_rubric, '{}')) then raise exception 'invalid_rubric' using errcode = '22023'; end if;
  select count(*) into v_n from jsonb_object_keys(coalesce(p_rubric, '{}'));
  -- 끝내기는 4항목 모두, 돌려주기는 루브릭이 모자라면 코멘트가 있어야 한다
  if (not p_allow_revision and v_n <> 4) or (p_allow_revision and v_n < 4 and char_length(trim(coalesce(p_feedback, ''))) = 0) then
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
  update public.sessions set status = case when p_allow_revision then 'returned'::public.session_status else v_sess.status end, current_step = 'report', updated_at = v_now where id = v_sess.id;
  delete from public.grade_drafts where submission_id = p_submission;
  perform private.emit(v_sess.id, 'report_returned', jsonb_build_object('version', v_sub.version, 'final', not p_allow_revision, 'guideline', '6.3'));
  return v_now;
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('app_return_submission', 'app_offer_help', 'app_answer_help') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
