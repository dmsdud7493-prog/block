-- 0007_sketch.sql — 곡선 예측 그리기 저장 (지침 3.1, plan S8). 형성평가: 채점하지 않고 결과 그래프에 겹쳐 보여 준다.
alter table public.predictions add column sketch jsonb;

create or replace function public.app_set_prediction_sketch(p_student uuid, p_session uuid, p_target text, p_sketch jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.editable_session(p_student, p_session);
  if jsonb_typeof(p_sketch) <> 'array' or jsonb_array_length(p_sketch) > 12 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.predictions set sketch = p_sketch, updated_at = now() where session_id = p_session and target = p_target;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.app_set_prediction_sketch(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.app_set_prediction_sketch(uuid, uuid, text, jsonb) to service_role;
