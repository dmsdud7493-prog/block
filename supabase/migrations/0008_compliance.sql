-- 0008_compliance.sql — 데이터 삭제·보존(R10), LLM 비용 집계(plan §6.4), 지침별 파일럿 지표(설계원리 타당화) (plan S9)

-- ── 데이터 삭제 ────────────────────────────────────────────────
-- 학생 계정 삭제: auth.users → profiles → enrollments·sessions → (프로그램·실행·측정·예측·보고서·제출·대화·이벤트) cascade.
-- 담당 교사만, 그리고 그 학생이 다른 교사 반에 함께 등록되어 있지 않을 때만 지운다(다른 반 기록을 대신 지우지 않기 위해).
create or replace function public.app_delete_student(p_teacher uuid, p_student uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_sessions int;
begin
  perform private.require_teacher(p_teacher);
  if not exists (select 1 from public.enrollments e join public.classes c on c.id = e.class_id
                  where e.student_id = p_student and c.teacher_id = p_teacher) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.enrollments e join public.classes c on c.id = e.class_id
              where e.student_id = p_student and c.teacher_id <> p_teacher) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select count(*) into v_sessions from public.sessions where student_id = p_student;
  delete from auth.users where id = p_student;
  return v_sessions;
end $$;

-- 반 삭제(학년 말): 반·과제·세션 기록을 지우고, 이 반에만 있던 학생 계정도 지운다
create or replace function public.app_delete_class(p_teacher uuid, p_class uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_students uuid[]; v_n int;
begin
  perform private.require_class_teacher(p_teacher, p_class);
  select coalesce(array_agg(e.student_id), '{}') into v_students
    from public.enrollments e
   where e.class_id = p_class
     and not exists (select 1 from public.enrollments o where o.student_id = e.student_id and o.class_id <> p_class);
  delete from public.classes where id = p_class;
  delete from auth.users where id = any(v_students);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- 보존 기간 지난 학생 계정 정리 (pg_cron 등으로 학교가 정한 주기에 실행 — DEPLOY.md)
create or replace function private.purge_inactive_students(p_months int)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if p_months < 1 then raise exception 'invalid_input' using errcode = '22023'; end if;
  delete from auth.users u
   using public.profiles p
   where p.id = u.id and p.role = 'student'
     and coalesce((select max(s.updated_at) from public.sessions s where s.student_id = p.id), p.created_at)
         < now() - make_interval(months => p_months);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ── LLM 사용량·비용 ───────────────────────────────────────────
-- 단가는 저장소에 적어 두지 않는다(바뀔 수 있음). 운영자가 공식 가격표를 보고 넣는다(DEPLOY.md). 비어 있으면 비용은 null.
create table public.llm_prices (
  model text primary key,
  input_per_mtok numeric,
  output_per_mtok numeric,
  cache_read_per_mtok numeric,
  cache_write_per_mtok numeric,
  updated_at timestamptz not null default now()
);
alter table public.llm_prices enable row level security;
create policy "prices: signed in" on public.llm_prices for select to authenticated using (true);

create view public.v_llm_usage_daily with (security_invoker = true) as
with u as (
  select (m.created_at at time zone 'Asia/Seoul')::date as day, s.class_id, x.slug,
         coalesce(m.meta ->> 'model', 'unknown') as model,
         coalesce((m.meta #>> '{usage,input}')::int, 0) as input,
         coalesce((m.meta #>> '{usage,output}')::int, 0) as output,
         coalesce((m.meta #>> '{usage,cacheRead}')::int, 0) as cache_read,
         coalesce((m.meta #>> '{usage,cacheWrite}')::int, 0) as cache_write
    from public.chat_messages m
    join public.sessions s on s.id = m.session_id
    join public.experiments x on x.id = s.experiment_id
   where m.role = 'assistant' and jsonb_typeof(m.meta -> 'usage') = 'object'
)
select u.day, u.class_id, u.slug, u.model, count(*) as replies,
       sum(u.input) as input_tokens, sum(u.output) as output_tokens, sum(u.cache_read) as cache_read_tokens, sum(u.cache_write) as cache_write_tokens,
       round((sum(u.input) * p.input_per_mtok + sum(u.output) * p.output_per_mtok
            + sum(u.cache_read) * coalesce(p.cache_read_per_mtok, 0) + sum(u.cache_write) * coalesce(p.cache_write_per_mtok, 0)) / 1e6, 4) as est_cost_usd
  from u left join public.llm_prices p on p.model = u.model
 group by u.day, u.class_id, u.slug, u.model, p.input_per_mtok, p.output_per_mtok, p.cache_read_per_mtok, p.cache_write_per_mtok;

-- ── 지침별 파일럿 지표 (docs/design-principles-impl.md "파일럿 지표" 열) ──
create view public.v_guideline_metrics with (security_invoker = true) as
with s as (
  select s.id, s.class_id, x.slug, s.status from public.sessions s join public.experiments x on x.id = s.experiment_id
),
pred as (
  select p.session_id, count(*) as n, sum(p.hints_used) as hints, count(*) filter (where p.matched is not null) as explained,
         count(*) filter (where p.matched) as matched, count(*) filter (where p.sketch is not null) as sketched
    from public.predictions p group by p.session_id
),
runs as (
  select r.session_id, count(*) as n, count(*) filter (where not r.ok) as failed from public.runs r group by r.session_id
),
calc as (
  select m.session_id, m.key, min(m.attempt) filter (where m.is_correct) as solved_at from public.measurements m group by m.session_id, m.key
),
prog as (
  select distinct on (b.session_id) b.session_id,
         exists (select 1 from jsonb_array_elements(b.program -> 'variables') v where char_length(coalesce(v ->> 'rationale', '')) > 0) as has_rationale
    from public.block_programs b order by b.session_id, b.version desc
),
chat as (
  select m.session_id, count(*) as replies, avg((m.meta ->> 'hint_level')::numeric) as avg_hint
    from public.chat_messages m where m.role = 'assistant' group by m.session_id
),
sub as (
  select sb.session_id, private.report_ready(sb.report_snapshot -> 'content') as reflected,
         jsonb_array_length(coalesce(sb.report_snapshot -> 'ai_assisted_sections', '[]')) > 0 as ai_marked
    from public.submissions sb
)
select s.class_id, s.slug,
       count(*) as sessions,
       round(avg(coalesce(pred.hints, 0)::numeric / nullif(pred.n, 0)), 2) as g42_hints_per_prediction,
       round(avg((pred.sketched > 0)::int), 2) as g31_sketch_rate,
       round(avg(pred.explained::numeric / nullif(pred.n, 0)), 2) as g33_explained_rate,
       round(avg(pred.matched::numeric / nullif(pred.explained, 0)), 2) as g33_matched_rate,
       round(avg(runs.n), 2) as g34_runs_per_session,
       round(sum(runs.failed)::numeric / nullif(sum(runs.n), 0), 2) as g32_failed_run_share,
       round((select avg(c.solved_at) from calc c join s s2 on s2.id = c.session_id where s2.class_id = s.class_id and s2.slug = s.slug), 2) as g53_attempts_to_correct,
       round(avg(prog.has_rationale::int), 2) as g24_rationale_rate,
       round(avg(chat.replies), 2) as g41_ai_replies_per_session,
       round(avg(chat.avg_hint), 2) as g44_avg_hint_level,
       round(avg(sub.reflected::int), 2) as g64_reflection_complete_rate,
       round(avg((sub.session_id is not null)::int), 2) as g6_submitted_rate,
       round(avg(sub.ai_marked::int), 2) as r11_ai_marked_rate
  from s
  left join pred on pred.session_id = s.id
  left join runs on runs.session_id = s.id
  left join prog on prog.session_id = s.id
  left join chat on chat.session_id = s.id
  left join sub on sub.session_id = s.id
 group by s.class_id, s.slug;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('app_delete_student', 'app_delete_class') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
revoke all on function private.purge_inactive_students(int) from public, anon, authenticated;
grant select on public.v_llm_usage_daily, public.v_guideline_metrics to authenticated;
grant execute on function private.report_ready(jsonb) to authenticated; -- 순수 함수, 지표 뷰(security_invoker)에서 쓴다
