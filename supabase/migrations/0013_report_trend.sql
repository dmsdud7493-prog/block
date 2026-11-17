-- 0013_report_trend.sql — 제출 조건에 결론("이 탐구로 알게 된 것", interpretation.trend 10자 이상)을 더한다 (2026-11-17 점검)
-- 화면 체크리스트(src/lib/report/template.ts submitChecklist)와 같은 기준. 함수 본문만 바꾼다(테이블·데이터 변경 없음).
-- 되돌리려면 0011_report_no_verdict.sql을 다시 적용하면 된다.

create or replace function private.report_ready(c jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select char_length(trim(coalesce(c #>> '{interpretation,evidence}', ''))) >= 5
     and char_length(trim(coalesce(c #>> '{interpretation,trend}', ''))) >= 10
     and char_length(trim(coalesce(c #>> '{interpretation,errorSources}', ''))) >= 5
     and char_length(trim(coalesce(c #>> '{interpretation,improvements}', ''))) >= 5
     and (
       (case when char_length(trim(coalesce(c #>> '{reflection,diff}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,hardest}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,curious}', ''))) >= 10 then 1 else 0 end)
     + (case when char_length(trim(coalesce(c #>> '{reflection,realLife}', ''))) >= 10 then 1 else 0 end)
     ) >= 3
$$;
