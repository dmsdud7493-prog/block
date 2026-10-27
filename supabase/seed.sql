-- 실험 6종 (2022 개정 [9과08-01]~[9과08-03])
insert into public.experiments (slug, title, standards) values
  ('density', '밀도 측정', '{9과08-01}'),
  ('melting', '녹는점 측정', '{9과08-01}'),
  ('boiling', '끓는점 측정', '{9과08-01,9과08-02}'),
  ('solubility', '용해도 측정', '{9과08-01}'),
  ('separation1', '끓는점 차를 이용한 혼합물 분리', '{9과08-03}'),
  ('separation2', '용해도 차를 이용한 혼합물 분리', '{9과08-03}')
on conflict (slug) do update set title = excluded.title, standards = excluded.standards;
