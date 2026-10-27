-- 0001_init.sql — 물질의 특성 가상실험실 스키마 (docs/plan.md §3.2, docs/engine.md §5)
-- 원칙: 학생 실명·이메일 컬럼 없음(R2). 채점·시뮬레이션 결과는 서버(service_role) 함수만 쓴다(ADR-P07).

create type public.app_role as enum ('student', 'teacher', 'admin');
create type public.session_status as enum ('in_progress', 'submitted', 'returned', 'resubmitted');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  display_name text not null check (char_length(display_name) between 1 and 40), -- 학번 또는 닉네임 (실명 금지)
  school text,
  consent_on_file boolean not null default false,  -- 보호자 동의서 수령 여부 (R1)
  consent_date date,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  settings jsonb not null default '{"hint_level_editing":"slots","tone":"haeyo","max_runs":null,"rationale_gate":false}',
  created_at timestamptz not null default now()
);

create table public.enrollments (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  student_no text not null check (char_length(student_no) between 1 and 20),
  created_at timestamptz not null default now(),
  primary key (class_id, student_id),
  unique (class_id, student_no)
);

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  standards text[] not null default '{}',
  spec jsonb not null default '{}', -- 교사 편집 KB 등 서버 전용 (학생 SELECT 권한 없음)
  is_published boolean not null default true
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  experiment_id uuid not null references public.experiments (id),
  due_at timestamptz,
  allow_late boolean not null default true,
  settings_override jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  experiment_id uuid not null references public.experiments (id),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  seed text not null,
  status public.session_status not null default 'in_progress',
  current_step text not null default 'design',
  scaffold_level int not null default 0 check (scaffold_level between 0 and 3), -- 지침 4.4 페이딩
  inquiry jsonb not null default '{}', -- 탐구 문제·가설 (지침 1.1)
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (student_id, assignment_id)
);

create table public.block_programs ( -- 지침 3.4: 버전 누적, 덮어쓰지 않음
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  version int not null,
  program jsonb not null,
  blockly jsonb,
  saved_at timestamptz not null default now(),
  unique (session_id, version)
);

create table public.runs ( -- 지침 3.4 (docs/engine.md §5)
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  run_no int not null,
  program_version int not null,
  program jsonb not null,
  seed text not null,
  ok boolean not null,
  diagnostics jsonb not null default '[]',
  measurements jsonb not null default '[]',
  calc_requests jsonb not null default '[]',
  series jsonb not null default '[]',
  changed_vars text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (session_id, run_no)
);

create table public.measurements ( -- 학생이 입력한 계산값과 서버 채점 결과 (FORMATIVE, 재시도 누적)
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  run_id uuid not null references public.runs (id) on delete cascade,
  key text not null,
  value numeric,
  unit text,
  is_student_input boolean not null default true,
  is_correct boolean not null,
  error_type text,
  attempt int not null,
  created_at timestamptz not null default now()
);

create table public.predictions ( -- 지침 3.1·3.3
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  run_id uuid references public.runs (id) on delete set null,
  target text not null,
  choice text not null,
  rationale text not null,
  hints_used int not null default 0,
  matched boolean,
  rationale_after text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, target)
);

create table public.reports (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  content jsonb not null default '{}',
  ai_assisted_sections text[] not null default '{}',
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  late boolean not null default false,
  report_snapshot jsonb not null default '{}',
  rubric_scores jsonb,
  teacher_feedback text,
  ai_feedback jsonb,
  returned_at timestamptz,
  version int not null default 1
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  meta jsonb not null default '{}',
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.events ( -- 불변 로그, 교사 대시보드 원천 (D11)
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  ts timestamptz not null default now()
);

create table public.grade_audit_log ( -- CLAUDE.md 규칙 3: 성적 변경 기록
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index on public.enrollments (student_id);
create index on public.classes (teacher_id);
create index on public.assignments (class_id);
create index on public.sessions (class_id);
create index on public.sessions (student_id);
create index on public.block_programs (session_id, version desc);
create index on public.runs (session_id, run_no desc);
create index on public.measurements (session_id, key);
create index on public.chat_messages (session_id, created_at);
create index on public.events (class_id, ts desc);
create index on public.events (session_id, ts);

-- 새 auth 사용자 → profiles 행 (역할은 서버가 app_metadata로 지정, 기본 student)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'student'),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), '이름없음')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
