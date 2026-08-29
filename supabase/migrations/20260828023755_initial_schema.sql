-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  terms_accepted_at timestamptz not null,
  terms_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Financial accounts
create type public.account_type as enum (
  'bank',
  'savings',
  'cash',
  'credit_card',
  'wallet',
  'loan',
  'other'
);

create type public.account_status as enum ('active', 'archived');

create type public.account_nature as enum ('asset', 'liability');

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  type public.account_type not null,
  nature public.account_nature not null,
  institution text,
  currency char(3) not null default 'USD',
  initial_balance numeric(14, 2) not null default 0 check (initial_balance >= 0),
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index financial_accounts_user_name_unique_idx
  on public.financial_accounts (user_id, lower(name));

alter table public.financial_accounts enable row level security;

create policy "financial_accounts_all_own"
  on public.financial_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Categories
create type public.category_kind as enum ('income', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  kind public.category_kind not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_user_kind_name_unique_idx
  on public.categories (user_id, kind, lower(name));

alter table public.categories enable row level security;

create policy "categories_all_own"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Transactions
create type public.transaction_type as enum (
  'income',
  'expense',
  'transfer',
  'adjustment'
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  description text,
  note text,
  category_id uuid references public.categories (id) on delete set null,
  account_id uuid references public.financial_accounts (id) on delete restrict,
  counterparty_account_id uuid references public.financial_accounts (id) on delete restrict,
  transfer_group_id uuid,
  adjustment_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type in ('income', 'expense', 'adjustment') and account_id is not null)
    or (type = 'transfer' and account_id is not null and counterparty_account_id is not null)
  )
);

create index transactions_user_id_occurred_on_idx on public.transactions (user_id, occurred_on desc);
create index transactions_transfer_group_id_idx on public.transactions (transfer_group_id);

alter table public.transactions enable row level security;

create policy "transactions_all_own"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount_limit numeric(14, 2) not null check (amount_limit > 0),
  period_month int not null check (period_month between 1 and 12),
  period_year int not null check (period_year >= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period_month, period_year)
);

alter table public.budgets enable row level security;

create policy "budgets_all_own"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Saving goals
create type public.goal_status as enum ('active', 'completed', 'archived');

create table public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  status public.goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saving_goals enable row level security;

create policy "saving_goals_all_own"
  on public.saving_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Debts
create type public.debt_status as enum ('active', 'paid', 'archived');

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  creditor text,
  original_amount numeric(14, 2) not null check (original_amount > 0),
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  installment_amount numeric(14, 2),
  next_payment_date date,
  notes text,
  status public.debt_status not null default 'active',
  linked_account_id uuid references public.financial_accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_amount <= original_amount)
);

alter table public.debts enable row level security;

create policy "debts_all_own"
  on public.debts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger financial_accounts_set_updated_at
  before update on public.financial_accounts
  for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create trigger saving_goals_set_updated_at
  before update on public.saving_goals
  for each row execute function public.set_updated_at();

create trigger debts_set_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

-- Profile bootstrap on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (
    id,
    display_name,
    terms_accepted_at,
    terms_version
  )
  values (
    new.id,
    display_name,
    coalesce((new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz, now()),
    coalesce(new.raw_user_meta_data ->> 'terms_version', '1.0')
  );

  perform public.seed_default_categories(new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Default categories per user
create or replace function public.seed_default_categories(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, kind, is_system) values
    (target_user_id, 'Salario', 'income', true),
    (target_user_id, 'Freelance', 'income', true),
    (target_user_id, 'Otros ingresos', 'income', true),
    (target_user_id, 'Sin categoría', 'income', true),
    (target_user_id, 'Alimentación', 'expense', true),
    (target_user_id, 'Transporte', 'expense', true),
    (target_user_id, 'Vivienda', 'expense', true),
    (target_user_id, 'Servicios', 'expense', true),
    (target_user_id, 'Entretenimiento', 'expense', true),
    (target_user_id, 'Salud', 'expense', true),
    (target_user_id, 'Educación', 'expense', true),
    (target_user_id, 'Otros gastos', 'expense', true),
    (target_user_id, 'Sin categoría', 'expense', true);
end;
$$;

-- Account nature helper
create or replace function public.account_nature_for_type(account_type public.account_type)
returns public.account_nature
language sql
immutable
as $$
  select case
    when account_type in ('credit_card', 'loan') then 'liability'::public.account_nature
    else 'asset'::public.account_nature
  end;
$$;

-- Delete user account (called from authenticated API with service role)
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
