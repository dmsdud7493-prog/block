-- 0015 (2026-11-18 사용자 요청) 교사 "도와줄까?" — 1분 동안 답이 없으면 다시 보낼 수 있다
-- 0014는 답을 기다리는 물음이 10분 안이면 새로 만들지 않고 그것을 돌려줬다. 이제 1분으로 줄인다.
-- 두 번째 물음인지(바로 앞 물음에도 답이 없었는지)는 학생 화면이 /api/help poll에서 판단한다(화난 선생님 말풍선).
-- 되돌리기: 0014의 app_offer_help를 다시 적용한다.
create or replace function public.app_offer_help(p_teacher uuid, p_session uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.sessions; v_id uuid;
begin
  select * into v from public.sessions where id = p_session;
  if v.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.require_class_teacher(p_teacher, v.class_id);
  select h.id into v_id from public.help_offers h
   where h.session_id = p_session and h.answer is null and h.created_at > now() - interval '1 minute'
   order by h.created_at desc limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.help_offers (session_id, class_id, teacher_id) values (p_session, v.class_id, p_teacher) returning id into v_id;
  perform private.emit(p_session, 'help_offered', jsonb_build_object('offerId', v_id, 'guideline', '4.3'));
  return v_id;
end $$;

revoke all on function public.app_offer_help(uuid, uuid) from public, anon, authenticated;
grant execute on function public.app_offer_help(uuid, uuid) to service_role;
