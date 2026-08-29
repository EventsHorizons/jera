-- ============================================================
-- Database integrity hardening
-- Composite ownership, CHECKs, indexes, goal amount sync
-- No new Institution / Currency / BudgetCategory tables
-- ============================================================

-- ------------------------------------------------------------
-- A. Account CHECKs
-- ------------------------------------------------------------
alter table public.financial_accounts
  drop constraint if exists financial_accounts_currency_format_check;

alter table public.financial_accounts
  add constraint financial_accounts_currency_format_check
  check (currency ~ '^[A-Z]{3}$');

alter table public.financial_accounts
  drop constraint if exists financial_accounts_nature_matches_type_check;

alter table public.financial_accounts
  add constraint financial_accounts_nature_matches_type_check
  check (nature = public.account_nature_for_type(type));

-- ------------------------------------------------------------
-- B. Transaction CHECKs + transfer_group required for transfers
-- ------------------------------------------------------------
update public.transactions
set transfer_group_id = gen_random_uuid()
where type = 'transfer'
  and transfer_group_id is null;

alter table public.transactions
  drop constraint if exists transactions_settlement_type_check;

alter table public.transactions
  add constraint transactions_settlement_type_check
  check (not is_settlement or type in ('transfer', 'adjustment'));

alter table public.transactions
  drop constraint if exists transactions_shape_check;

alter table public.transactions
  add constraint transactions_shape_check check (
    (
      type in ('income', 'expense')
      and account_id is not null
      and counterparty_account_id is null
      and adjustment_direction is null
      and transfer_group_id is null
    )
    or (
      type = 'transfer'
      and account_id is not null
      and counterparty_account_id is not null
      and account_id <> counterparty_account_id
      and category_id is null
      and adjustment_direction is null
      and transfer_group_id is not null
    )
    or (
      type = 'adjustment'
      and account_id is not null
      and counterparty_account_id is null
      and category_id is null
      and adjustment_direction is not null
      and adjustment_reason is not null
      and char_length(trim(adjustment_reason)) >= 5
      and transfer_group_id is null
    )
  );

-- ------------------------------------------------------------
-- C. Category uniqueness scoped by parent + parent integrity
-- ------------------------------------------------------------
drop index if exists public.categories_user_kind_name_unique_idx;

create unique index if not exists categories_user_kind_parent_name_unique_idx
  on public.categories (user_id, kind, parent_id, lower(name))
  nulls not distinct;

create index if not exists categories_user_parent_idx
  on public.categories (user_id, parent_id);

create or replace function public.validate_category_parent()
returns trigger
language plpgsql
as $$
declare
  v_parent public.categories%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'invalid_category_parent';
  end if;

  select * into v_parent
  from public.categories
  where id = new.parent_id;

  if not found then
    raise exception 'invalid_category_parent';
  end if;

  if v_parent.user_id <> new.user_id then
    raise exception 'cross_user_category_parent';
  end if;

  if v_parent.kind <> new.kind then
    raise exception 'category_parent_kind_mismatch';
  end if;

  -- Single nesting level: parent must be a root category
  if v_parent.parent_id is not null then
    raise exception 'category_nesting_too_deep';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_validate_parent on public.categories;
create trigger categories_validate_parent
  before insert or update on public.categories
  for each row execute function public.validate_category_parent();

-- ------------------------------------------------------------
-- D. Shared ownership helpers
-- ------------------------------------------------------------
create or replace function public.assert_account_owned_by(
  p_user_id uuid,
  p_account_id uuid
)
returns void
language plpgsql
stable
as $$
declare
  v_owner uuid;
begin
  if p_account_id is null then
    return;
  end if;

  select user_id into v_owner
  from public.financial_accounts
  where id = p_account_id;

  if v_owner is null then
    raise exception 'account_not_found';
  end if;

  if v_owner <> p_user_id then
    raise exception 'cross_user_account';
  end if;
end;
$$;

create or replace function public.assert_category_owned_by(
  p_user_id uuid,
  p_category_id uuid,
  p_expected_kind public.category_kind default null
)
returns void
language plpgsql
stable
as $$
declare
  v_cat public.categories%rowtype;
begin
  if p_category_id is null then
    return;
  end if;

  select * into v_cat
  from public.categories
  where id = p_category_id;

  if not found then
    raise exception 'category_not_found';
  end if;

  if v_cat.user_id <> p_user_id then
    raise exception 'cross_user_category';
  end if;

  if p_expected_kind is not null and v_cat.kind <> p_expected_kind then
    raise exception 'category_kind_mismatch';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- E. Transaction ownership + currency consistency
-- ------------------------------------------------------------
create or replace function public.validate_transaction_ownership()
returns trigger
language plpgsql
as $$
declare
  v_from public.financial_accounts%rowtype;
  v_to public.financial_accounts%rowtype;
begin
  perform public.assert_account_owned_by(new.user_id, new.account_id);
  perform public.assert_account_owned_by(new.user_id, new.counterparty_account_id);

  if new.type in ('income', 'expense') then
    perform public.assert_category_owned_by(
      new.user_id,
      new.category_id,
      case when new.type = 'income' then 'income'::public.category_kind
           else 'expense'::public.category_kind end
    );
  end if;

  if new.type = 'transfer' then
    select * into v_from from public.financial_accounts where id = new.account_id;
    select * into v_to from public.financial_accounts where id = new.counterparty_account_id;

    if v_from.currency <> v_to.currency then
      raise exception 'currency_mismatch';
    end if;
  end if;

  if new.reimburses_transaction_id is not null then
    -- ownership of reimbursement target already validated by validate_reimbursement
    null;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_validate_ownership on public.transactions;
create trigger transactions_validate_ownership
  before insert or update on public.transactions
  for each row execute function public.validate_transaction_ownership();

-- ------------------------------------------------------------
-- F. Budgets / debts / payments / goals / recurring ownership
-- ------------------------------------------------------------
create or replace function public.validate_budget_ownership()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_category_owned_by(
    new.user_id,
    new.category_id,
    'expense'::public.category_kind
  );
  return new;
end;
$$;

drop trigger if exists budgets_validate_ownership on public.budgets;
create trigger budgets_validate_ownership
  before insert or update on public.budgets
  for each row execute function public.validate_budget_ownership();

create or replace function public.validate_debt_linked_account()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_account_owned_by(new.user_id, new.linked_account_id);
  return new;
end;
$$;

drop trigger if exists debts_validate_linked_account on public.debts;
create trigger debts_validate_linked_account
  before insert or update on public.debts
  for each row execute function public.validate_debt_linked_account();

create or replace function public.validate_debt_payment_ownership()
returns trigger
language plpgsql
as $$
declare
  v_debt_user uuid;
  v_tx_user uuid;
begin
  select user_id into v_debt_user
  from public.debts
  where id = new.debt_id;

  if v_debt_user is null or v_debt_user <> new.user_id then
    raise exception 'cross_user_debt';
  end if;

  if new.transaction_id is not null then
    select user_id into v_tx_user
    from public.transactions
    where id = new.transaction_id;

    if v_tx_user is null or v_tx_user <> new.user_id then
      raise exception 'cross_user_debt_payment_tx';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists debt_payments_validate_ownership on public.debt_payments;
create trigger debt_payments_validate_ownership
  before insert or update on public.debt_payments
  for each row execute function public.validate_debt_payment_ownership();

create or replace function public.validate_goal_contribution_ownership()
returns trigger
language plpgsql
as $$
declare
  v_goal_user uuid;
begin
  select user_id into v_goal_user
  from public.saving_goals
  where id = new.goal_id;

  if v_goal_user is null or v_goal_user <> new.user_id then
    raise exception 'cross_user_goal';
  end if;

  return new;
end;
$$;

drop trigger if exists goal_contributions_validate_ownership on public.goal_contributions;
create trigger goal_contributions_validate_ownership
  before insert or update on public.goal_contributions
  for each row execute function public.validate_goal_contribution_ownership();

create or replace function public.validate_recurring_ownership()
returns trigger
language plpgsql
as $$
declare
  v_from public.financial_accounts%rowtype;
  v_to public.financial_accounts%rowtype;
begin
  perform public.assert_account_owned_by(new.user_id, new.account_id);
  perform public.assert_account_owned_by(new.user_id, new.counterparty_account_id);

  if new.type in ('income', 'expense') then
    perform public.assert_category_owned_by(
      new.user_id,
      new.category_id,
      case when new.type = 'income' then 'income'::public.category_kind
           else 'expense'::public.category_kind end
    );
  end if;

  if new.type = 'transfer' then
    select * into v_from from public.financial_accounts where id = new.account_id;
    select * into v_to from public.financial_accounts where id = new.counterparty_account_id;
    if v_from.currency <> v_to.currency then
      raise exception 'currency_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists recurring_transactions_validate_ownership on public.recurring_transactions;
create trigger recurring_transactions_validate_ownership
  before insert or update on public.recurring_transactions
  for each row execute function public.validate_recurring_ownership();

create or replace function public.validate_recurring_generation_ownership()
returns trigger
language plpgsql
as $$
declare
  v_rule_user uuid;
  v_tx_user uuid;
begin
  select user_id into v_rule_user
  from public.recurring_transactions
  where id = new.recurring_id;

  if v_rule_user is null or v_rule_user <> new.user_id then
    raise exception 'cross_user_recurring';
  end if;

  select user_id into v_tx_user
  from public.transactions
  where id = new.transaction_id;

  if v_tx_user is null or v_tx_user <> new.user_id then
    raise exception 'cross_user_recurring_tx';
  end if;

  return new;
end;
$$;

drop trigger if exists recurring_generations_validate_ownership on public.recurring_generations;
create trigger recurring_generations_validate_ownership
  before insert or update on public.recurring_generations
  for each row execute function public.validate_recurring_generation_ownership();

-- ------------------------------------------------------------
-- G. Goal current_amount sync from contributions (single source)
-- ------------------------------------------------------------
create or replace function public.sync_goal_current_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal_id uuid;
  v_sum numeric;
  v_target numeric;
  v_status public.goal_status;
begin
  v_goal_id := coalesce(new.goal_id, old.goal_id);

  select coalesce(sum(amount), 0) into v_sum
  from public.goal_contributions
  where goal_id = v_goal_id;

  select target_amount, status into v_target, v_status
  from public.saving_goals
  where id = v_goal_id;

  if not found then
    return coalesce(new, old);
  end if;

  update public.saving_goals
  set current_amount = v_sum,
      status = case
        when status = 'archived' then status
        when v_sum >= target_amount then 'completed'::public.goal_status
        when status = 'completed' and v_sum < target_amount then 'active'::public.goal_status
        else status
      end
  where id = v_goal_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists goal_contributions_sync_amount on public.goal_contributions;
create trigger goal_contributions_sync_amount
  after insert or update or delete on public.goal_contributions
  for each row execute function public.sync_goal_current_amount();

-- Prevent manual divergence of current_amount from contributions
create or replace function public.protect_goal_current_amount()
returns trigger
language plpgsql
as $$
declare
  v_sum numeric;
begin
  if tg_op = 'UPDATE'
     and new.current_amount is distinct from old.current_amount then
    select coalesce(sum(amount), 0) into v_sum
    from public.goal_contributions
    where goal_id = new.id;

    -- Allow updates that match the contribution sum (idempotent app writes)
    if new.current_amount is distinct from v_sum then
      new.current_amount := v_sum;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists saving_goals_protect_current_amount on public.saving_goals;
create trigger saving_goals_protect_current_amount
  before update on public.saving_goals
  for each row execute function public.protect_goal_current_amount();

-- ------------------------------------------------------------
-- H. Performance indexes for real queries
-- ------------------------------------------------------------
create index if not exists transactions_account_id_idx
  on public.transactions (account_id);

create index if not exists transactions_counterparty_account_id_idx
  on public.transactions (counterparty_account_id);

create index if not exists transactions_user_type_occurred_idx
  on public.transactions (user_id, type, occurred_on desc);

create index if not exists transactions_user_category_occurred_idx
  on public.transactions (user_id, category_id, occurred_on desc)
  where category_id is not null;

create index if not exists financial_accounts_user_status_idx
  on public.financial_accounts (user_id, status);

create index if not exists debts_user_status_idx
  on public.debts (user_id, status);

create index if not exists saving_goals_user_status_idx
  on public.saving_goals (user_id, status);

create index if not exists goal_contributions_goal_id_idx
  on public.goal_contributions (goal_id);

create index if not exists debt_payments_debt_id_idx
  on public.debt_payments (debt_id);

create index if not exists debt_payments_transaction_id_idx
  on public.debt_payments (transaction_id)
  where transaction_id is not null;

create index if not exists recurring_generations_user_id_idx
  on public.recurring_generations (user_id);
