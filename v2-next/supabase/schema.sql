create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  email text not null unique,
  college text default '',
  branch text default '',
  cgpa numeric(4,2),
  skills text[] default '{}',
  linkedin text default '',
  github text default '',
  current_streak integer default 0,
  longest_streak integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.questions (
  id text primary key,
  title text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard','Mixed')),
  topic text not null,
  companies text[] default '{}',
  problem text,
  explanation text,
  solution text,
  tags text[] default '{}',
  embedding vector(384),
  created_at timestamptz default now()
);

create table if not exists public.mcqs (
  id text primary key,
  title text not null,
  domain text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  explanation text not null,
  tags text[] default '{}',
  companies text[] default '{}',
  embedding vector(384),
  created_at timestamptz default now()
);

create unique index if not exists mcqs_unique_signature on public.mcqs (md5(question || options::text || correct_answer));
create index if not exists mcqs_domain_idx on public.mcqs(domain);
create index if not exists mcqs_topic_idx on public.mcqs(topic);
create index if not exists mcqs_difficulty_idx on public.mcqs(difficulty);

create table if not exists public.companies (
  id text primary key,
  name text not null unique,
  eligibility text,
  hiring_process text,
  interview_stages jsonb default '[]',
  preparation_strategy text,
  created_at timestamptz default now()
);

create table if not exists public.roadmaps (
  id text primary key,
  title text not null,
  role text not null,
  steps jsonb not null,
  resources jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text references public.questions(id) on delete cascade,
  content_id text,
  topic text,
  difficulty text,
  status text not null check (status in ('viewed','solved','read','completed')),
  updated_at timestamptz default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  item_id text not null,
  created_at timestamptz default now(),
  unique(user_id, item_type, item_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  item_id text not null,
  note text not null,
  updated_at timestamptz default now(),
  unique(user_id, item_type, item_id)
);

create table if not exists public.mcq_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mcq_id text references public.mcqs(id) on delete cascade,
  domain text,
  topic text,
  selected_answer text,
  correct_answer text,
  score integer not null default 0,
  total integer not null default 1,
  time_taken integer,
  created_at timestamptz default now()
);

create table if not exists public.projects (
  id text primary key,
  title text not null,
  level text not null,
  description text,
  tech_stack text[] default '{}',
  folder_structure jsonb default '{}',
  api_structure jsonb default '{}',
  resume_description text,
  interview_questions jsonb default '[]'
);

create table if not exists public.resume_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ats_score integer not null,
  missing_keywords text[] default '{}',
  improvements jsonb default '[]',
  resume_text text,
  target_role text,
  skills_found text[] default '{}',
  project_feedback jsonb default '[]',
  raw_report jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.ai_cache (
  cache_key text primary key,
  report_type text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  questions_solved integer not null default 0,
  mcqs_attempted integer not null default 0,
  mcq_accuracy integer not null default 0,
  study_minutes integer not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  domain text,
  topic text,
  difficulty text,
  status text not null default 'viewed',
  score integer,
  time_taken integer,
  metadata jsonb default '{}',
  updated_at timestamptz default now(),
  unique(user_id, content_type, content_id)
);

create table if not exists public.quiz_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'ai',
  domain text not null,
  topic text,
  difficulty text,
  question_hash text not null,
  question jsonb not null,
  selected_answer text,
  correct_answer text,
  score integer default 0,
  time_taken integer,
  attempted_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, question_hash)
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  plan jsonb not null,
  starts_on date default current_date,
  ends_on date,
  status text not null default 'active',
  created_at timestamptz default now()
);

create table if not exists public.readiness_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_company text,
  target_role text,
  score integer not null,
  missing_skills text[] default '{}',
  recommendations jsonb default '[]',
  evidence jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  xp integer not null default 0,
  rank integer,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.mcqs enable row level security;
alter table public.companies enable row level security;
alter table public.roadmaps enable row level security;
alter table public.projects enable row level security;
alter table public.progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notes enable row level security;
alter table public.mcq_results enable row level security;
alter table public.resume_reports enable row level security;
alter table public.ai_reports enable row level security;
alter table public.ai_cache enable row level security;
alter table public.user_stats enable row level security;
alter table public.user_progress enable row level security;
alter table public.quiz_history enable row level security;
alter table public.study_plans enable row level security;
alter table public.readiness_scores enable row level security;

create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "progress own" on public.progress for all using (auth.uid() = user_id);
create policy "bookmarks own" on public.bookmarks for all using (auth.uid() = user_id);
create policy "notes own" on public.notes for all using (auth.uid() = user_id);
create policy "mcq results own" on public.mcq_results for all using (auth.uid() = user_id);
create policy "resume reports own" on public.resume_reports for all using (auth.uid() = user_id);
create policy "ai reports own" on public.ai_reports for all using (auth.uid() = user_id);
create policy "user stats own" on public.user_stats for all using (auth.uid() = user_id);
create policy "user progress own" on public.user_progress for all using (auth.uid() = user_id);
create policy "quiz history own" on public.quiz_history for all using (auth.uid() = user_id);
create policy "study plans own" on public.study_plans for all using (auth.uid() = user_id);
create policy "readiness scores own" on public.readiness_scores for all using (auth.uid() = user_id);

create policy "public questions read" on public.questions for select using (true);
create policy "public mcqs read" on public.mcqs for select using (true);
create policy "public companies read" on public.companies for select using (true);
create policy "public roadmaps read" on public.roadmaps for select using (true);
create policy "public projects read" on public.projects for select using (true);
