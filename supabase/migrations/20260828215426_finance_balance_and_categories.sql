-- Subcategories + adjustment direction
alter table public.categories
  add column if not exists parent_id uuid references public.categories (id) on delete cascade;

create type public.adjustment_direction as enum ('increase', 'decrease');

alter table public.transactions
  add column if not exists adjustment_direction public.adjustment_direction;

alter table public.transactions
  drop constraint if exists transactions_check;

alter table public.transactions
  add constraint transactions_shape_check check (
    (
      type in ('income', 'expense')
      and account_id is not null
      and counterparty_account_id is null
      and adjustment_direction is null
    )
    or (
      type = 'transfer'
      and account_id is not null
      and counterparty_account_id is not null
      and account_id <> counterparty_account_id
      and category_id is null
      and adjustment_direction is null
    )
    or (
      type = 'adjustment'
      and account_id is not null
      and counterparty_account_id is null
      and category_id is null
      and adjustment_direction is not null
      and adjustment_reason is not null
      and char_length(trim(adjustment_reason)) >= 5
    )
  );

-- Balance effect for one account from one transaction row
create or replace function public.transaction_effect_on_account(
  p_type public.transaction_type,
  p_amount numeric,
  p_account_id uuid,
  p_counterparty_account_id uuid,
  p_target_account_id uuid,
  p_account_nature public.account_nature,
  p_adjustment_direction public.adjustment_direction
)
returns numeric
language sql
immutable
as $$
  select case
    when p_type = 'income' and p_account_id = p_target_account_id then
      case when p_account_nature = 'asset' then p_amount else -p_amount end
    when p_type = 'expense' and p_account_id = p_target_account_id then
      case when p_account_nature = 'asset' then -p_amount else p_amount end
    when p_type = 'transfer' and p_account_id = p_target_account_id then
      case when p_account_nature = 'asset' then -p_amount else p_amount end
    when p_type = 'transfer' and p_counterparty_account_id = p_target_account_id then
      case when p_account_nature = 'asset' then p_amount else -p_amount end
    when p_type = 'adjustment' and p_account_id = p_target_account_id then
      case
        when p_adjustment_direction = 'increase' then p_amount
        else -p_amount
      end
    else 0
  end;
$$;

create or replace function public.get_account_balance(p_account_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_initial numeric;
  v_nature public.account_nature;
  v_delta numeric;
begin
  select user_id, initial_balance, nature
  into v_user_id, v_initial, v_nature
  from public.financial_accounts
  where id = p_account_id;

  if v_user_id is null then
    return null;
  end if;

  if auth.uid() is not null and auth.uid() <> v_user_id then
    raise exception 'not_authorized';
  end if;

  select coalesce(sum(
    public.transaction_effect_on_account(
      t.type,
      t.amount,
      t.account_id,
      t.counterparty_account_id,
      p_account_id,
      v_nature,
      t.adjustment_direction
    )
  ), 0)
  into v_delta
  from public.transactions t
  where t.user_id = v_user_id
    and (t.account_id = p_account_id or t.counterparty_account_id = p_account_id);

  return v_initial + v_delta;
end;
$$;

revoke all on function public.get_account_balance(uuid) from public;
grant execute on function public.get_account_balance(uuid) to authenticated;

create or replace function public.get_accounts_with_balance()
returns table (
  id uuid,
  user_id uuid,
  name text,
  type public.account_type,
  nature public.account_nature,
  institution text,
  currency char(3),
  initial_balance numeric,
  status public.account_status,
  created_at timestamptz,
  updated_at timestamptz,
  current_balance numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.id,
    a.user_id,
    a.name,
    a.type,
    a.nature,
    a.institution,
    a.currency,
    a.initial_balance,
    a.status,
    a.created_at,
    a.updated_at,
    public.get_account_balance(a.id) as current_balance
  from public.financial_accounts a
  where a.user_id = auth.uid();
$$;

revoke all on function public.get_accounts_with_balance() from public;
grant execute on function public.get_accounts_with_balance() to authenticated;

-- Debt payments journal (links payments to debts + optional transaction)
create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  debt_id uuid not null references public.debts (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  paid_on date not null default current_date,
  transaction_id uuid references public.transactions (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.debt_payments enable row level security;

create policy "debt_payments_all_own"
  on public.debt_payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Goal contributions
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.saving_goals (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  contributed_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

alter table public.goal_contributions enable row level security;

create policy "goal_contributions_all_own"
  on public.goal_contributions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
