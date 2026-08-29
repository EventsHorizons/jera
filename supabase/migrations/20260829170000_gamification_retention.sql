-- Gamification / retention tables for Jera

-- Preferences on profiles
alter table public.profiles
  add column if not exists cohort_opt_in boolean not null default false;

alter table public.profiles
  add column if not exists health_score numeric(5, 2) not null default 50
    check (health_score >= 0 and health_score <= 100);

alter table public.profiles
  add column if not exists health_updated_at timestamptz;

-- Streaks
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_qualified_on date,
  freeze_tokens integer not null default 0 check (freeze_tokens >= 0 and freeze_tokens <= 5),
  milestones_claimed integer[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

drop policy if exists user_streaks_all_own on public.user_streaks;
create policy user_streaks_all_own
  on public.user_streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.streak_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('transaction', 'budget_checkin', 'freeze_used')),
  created_at timestamptz not null default now()
);

create unique index if not exists streak_events_user_day_kind_uidx
  on public.streak_events (user_id, occurred_on, kind);

create index if not exists streak_events_user_day_idx
  on public.streak_events (user_id, occurred_on desc);

alter table public.streak_events enable row level security;

drop policy if exists streak_events_all_own on public.streak_events;
create policy streak_events_all_own
  on public.streak_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- XP / levels
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp_total integer not null default 0 check (xp_total >= 0),
  level integer not null default 1 check (level >= 1 and level <= 10),
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists user_progress_all_own on public.user_progress;
create policy user_progress_all_own
  on public.user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null check (reason in (
    'expense_logged',
    'budget_checkin',
    'streak_day',
    'streak_milestone',
    'under_budget_day',
    'goal_contribute',
    'debt_pay',
    'story_viewed'
  )),
  ref_id uuid,
  day date not null,
  created_at timestamptz not null default now()
);

create index if not exists xp_ledger_user_day_reason_idx
  on public.xp_ledger (user_id, day, reason);

alter table public.xp_ledger enable row level security;

drop policy if exists xp_ledger_select_own on public.xp_ledger;
create policy xp_ledger_select_own
  on public.xp_ledger for select
  using (auth.uid() = user_id);

drop policy if exists xp_ledger_insert_own on public.xp_ledger;
create policy xp_ledger_insert_own
  on public.xp_ledger for insert
  with check (auth.uid() = user_id);

-- Insight stories
create table if not exists public.insight_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'comparison',
    'anomaly',
    'budget',
    'health',
    'cohort_tease'
  )),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_on date not null default (timezone('utc', now()))::date,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists insight_stories_user_unread_idx
  on public.insight_stories (user_id, created_at desc)
  where read_at is null;

alter table public.insight_stories enable row level security;

drop policy if exists insight_stories_all_own on public.insight_stories;
create policy insight_stories_all_own
  on public.insight_stories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Achievements
create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  sort_order integer not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists user_achievements_select_own on public.user_achievements;
create policy user_achievements_select_own
  on public.user_achievements for select
  using (auth.uid() = user_id);

drop policy if exists user_achievements_insert_own on public.user_achievements;
create policy user_achievements_insert_own
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

-- Achievements catalog is readable by authenticated users
alter table public.achievements enable row level security;

drop policy if exists achievements_select_authenticated on public.achievements;
create policy achievements_select_authenticated
  on public.achievements for select
  to authenticated
  using (true);

insert into public.achievements (id, name, description, sort_order) values
  ('M01', 'Primer paso', 'Registraste tu primer gasto', 1),
  ('M02', 'Siete limpios', 'Racha de 7 días', 2),
  ('M03', 'Mes entero', 'Racha de 30 días', 3),
  ('M04', 'Bajo techo', '7 días con presupuestos respetados', 4),
  ('M05', 'Meta viva', 'Completaste una meta de ahorro', 5),
  ('M06', 'Deuda −1', 'Cerraste una deuda', 6),
  ('M07', 'Multimoneda', 'Movimientos en 2+ monedas', 7),
  ('M08', 'Cohorte top 30%', '4 semanas en el top 30% de presupuesto', 8)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- Notification prefs + log
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  streak_alerts boolean not null default true,
  budget_alerts boolean not null default true,
  insight_alerts boolean not null default true,
  cohort_alerts boolean not null default false,
  quiet_hours boolean not null default true,
  muted_streak_until date,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists notification_prefs_all_own on public.notification_prefs;
create policy notification_prefs_all_own
  on public.notification_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notif_id text not null,
  channel text not null default 'in_app',
  day date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default now()
);

create index if not exists notification_log_user_day_idx
  on public.notification_log (user_id, day, notif_id);

alter table public.notification_log enable row level security;

drop policy if exists notification_log_all_own on public.notification_log;
create policy notification_log_all_own
  on public.notification_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- In-app notification inbox (lightweight)
create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notif_id text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists in_app_notifications_user_idx
  on public.in_app_notifications (user_id, created_at desc);

alter table public.in_app_notifications enable row level security;

drop policy if exists in_app_notifications_all_own on public.in_app_notifications;
create policy in_app_notifications_all_own
  on public.in_app_notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
