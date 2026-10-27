-- 0004_tutor.sql — AI 튜터 대화 저장·위험 신호 플래그·스캐폴딩 페이딩 (지침 4.4, R6·R8)

create or replace function public.app_add_chat(p_student uuid, p_session uuid, p_role text, p_content text, p_meta jsonb, p_flagged boolean)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v public.sessions; v_id bigint;
begin
  select * into v from public.sessions where id = p_session and student_id = p_student;
  if v.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.chat_messages (session_id, role, content, meta, flagged)
  values (p_session, p_role, left(p_content, 4000), coalesce(p_meta, '{}'), coalesce(p_flagged, false))
  returning id into v_id;
  if coalesce(p_flagged, false) then
    insert into public.events (session_id, class_id, student_id, event_type, payload)
    values (p_session, v.class_id, p_student, 'ai_flagged', jsonb_build_object('chat_id', v_id, 'kind', p_meta ->> 'risk'));
  end if;
  if p_role = 'assistant' then
    insert into public.events (session_id, class_id, student_id, event_type, payload)
    values (p_session, v.class_id, p_student, case when (p_meta ->> 'nudge')::boolean then 'ai_nudge' else 'ai_reply' end,
            jsonb_build_object('hint_level', p_meta -> 'hint_level', 'source', p_meta ->> 'source', 'guideline', '4.1'));
  end if;
  return v_id;
end $$;

create or replace function public.app_set_scaffold(p_student uuid, p_session uuid, p_level int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.sessions set scaffold_level = greatest(0, least(3, p_level))
  where id = p_session and student_id = p_student;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
end $$;

-- 최근 대화 맥락 (튜터 호출 시 서버가 읽는다)
create or replace function public.app_tutor_context(p_student uuid, p_session uuid)
returns table (tone text, scaffold_level int, last_hint_level int, nudge_count int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.sessions where id = p_session and student_id = p_student) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select coalesce(c.settings ->> 'tone', 'haeyo'), s.scaffold_level,
      coalesce((select (m.meta ->> 'hint_level')::int from public.chat_messages m where m.session_id = s.id and m.role = 'assistant' order by m.id desc limit 1), -1),
      (select count(*)::int from public.events e where e.session_id = s.id and e.event_type = 'ai_nudge')
    from public.sessions s join public.classes c on c.id = s.class_id where s.id = p_session;
end $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('app_add_chat', 'app_set_scaffold', 'app_tutor_context') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
