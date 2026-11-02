-- 0011_report_no_verdict.sql — 제출 조건에서 "가설 판단 고르기"를 뺀다 (ADR-P19)
-- 보고서 해석·결론의 '예상이 맞았나요?'는 그대로 묻되 제출을 막지 않는다. 근거·오차·개선안 + 성찰 3개 이상은 그대로.
-- 함수 본문만 바꾼다(테이블·데이터 변경 없음). 되돌리려면 0005의 report_ready를 다시 적용하면 된다.

create or replace function private.report_ready(c jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select char_length(trim(coalesce(c #>> '{interpretation,evidence}', ''))) >= 5
     and char_length(trim(coalesce(c #>> '{interpretation,errorSources}', ''))) >= 5
     and char_length(trim(coalesce(c #>> '{interpretation,improvements}', ''))) >= 5
     and (
       (case when char_length(trim(coalesce(c #>> '{reflection,diff}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,hardest}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,curious}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,realLife}', ''))) >= 10 then 1 else 0 end)
     ) >= 3
$$;
