-- ============================================================
-- Financial domain hardening: reimbursements, settlements,
-- recurring rules, atomic debt payment, delete cascade fix
-- ============================================================

-- Link an income reimbursement to an original expense
alter table public.transactions
  add column if not exists reimburses_transaction_id uuid
    references public.transactions (id) on delete set null;

create index if not exists transactions_reimburses_idx
  on public.transactions (reimburses_transaction_id)
  where reimburses_transaction_id is not null;

-- Settlement flag: debt/CC payments that move money but are NOT consumption expenses
alter table public.transactions
  add column if not exists is_settlement boolean not null default false;

-- Recurring frequency / status
create type public.recurring_frequency as enum (
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

create type public.recurring_status as enum (
  'active',
  'paused',
  'cancelled'
);

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.transaction_type not null
    check (type in ('income', 'expense', 'transfer')),
  amount numeric(14, 2) not null check (amount > 0),
  account_id uuid not null references public.financial_accounts (id) on delete restrict,
  counterparty_account_id uuid references public.financial_accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  note text,
  frequency public.recurring_frequency not null,
  next_occurrence date not null,
  end_date date,
  status public.recurring_status not null default 'active',
  last_generated_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type in ('income', 'expense') and counterparty_account_id is null and category_id is not null)
    or (
      type = 'transfer'
      and counterparty_account_id is not null
      and account_id <> counterparty_account_id
      and category_id is null
    )
  ),
  check (end_date is null or end_date >= next_occurrence)
);

create index recurring_transactions_user_next_idx
  on public.recurring_transactions (user_id, next_occurrence)
  where status = 'active';

alter table public.recurring_transactions enable row level security;

create policy "recurring_transactions_all_own"
  on public.recurring_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger recurring_transactions_set_updated_at
  before update on public.recurring_transactions
  for each row execute function public.set_updated_at();

-- Idempotency ledger for generated occurrences
create table public.recurring_generations (
  id uuid primary key default gen_random_uuid(),
  recurring_id uuid not null references public.recurring_transactions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recurring_id, occurred_on)
);

alter table public.recurring_generations enable row level security;

create policy "recurring_generations_all_own"
  on public.recurring_generations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Advance next_occurrence helper
create or replace function public.advance_recurring_date(
  p_date date,
  p_frequency public.recurring_frequency
)
returns date
language sql
immutable
as $$
  select case p_frequency
    when 'daily' then (p_date + interval '1 day')::date
    when 'weekly' then (p_date + interval '7 days')::date
    when 'monthly' then (p_date + interval '1 month')::date
    when 'yearly' then (p_date + interval '1 year')::date
  end;
$$;

-- Generate due recurring transactions for the authenticated user (idempotent)
create or replace function public.generate_due_recurring_transactions(
  p_as_of date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_tx_id uuid;
  v_count int := 0;
  v_occ date;
  v_next date;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;

  for r in
    select *
    from public.recurring_transactions
    where user_id = v_uid
      and status = 'active'
      and next_occurrence <= p_as_of
      and (end_date is null or next_occurrence <= end_date)
    for update
  loop
    v_occ := r.next_occurrence;

    -- Skip if already generated for this occurrence (idempotent)
    if exists (
      select 1 from public.recurring_generations g
      where g.recurring_id = r.id and g.occurred_on = v_occ
    ) then
      v_next := public.advance_recurring_date(v_occ, r.frequency);
      update public.recurring_transactions
      set next_occurrence = v_next,
          last_generated_on = v_occ
      where id = r.id;
      continue;
    end if;

    insert into public.transactions (
      user_id,
      type,
      amount,
      occurred_on,
      description,
      note,
      category_id,
      account_id,
      counterparty_account_id,
      transfer_group_id
    )
    values (
      v_uid,
      r.type,
      r.amount,
      v_occ,
      coalesce(r.description, 'Recurrente'),
      r.note,
      r.category_id,
      r.account_id,
      r.counterparty_account_id,
      case when r.type = 'transfer' then gen_random_uuid() else null end
    )
    returning id into v_tx_id;

    insert into public.recurring_generations (
      recurring_id, user_id, occurred_on, transaction_id
    ) values (r.id, v_uid, v_occ, v_tx_id);

    v_next := public.advance_recurring_date(v_occ, r.frequency);

    update public.recurring_transactions
    set next_occurrence = v_next,
        last_generated_on = v_occ,
        status = case
          when r.end_date is not null and v_next > r.end_date then 'cancelled'::public.recurring_status
          else status
        end
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.generate_due_recurring_transactions(date) from public;
grant execute on function public.generate_due_recurring_transactions(date) to authenticated;

-- Atomic debt payment: transfer to linked liability OR settlement adjustment (not expense)
create or replace function public.pay_debt(
  p_debt_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_debt public.debts%rowtype;
  v_account public.financial_accounts%rowtype;
  v_linked public.financial_accounts%rowtype;
  v_pending numeric;
  v_balance numeric;
  v_tx_id uuid;
  v_paid numeric;
  v_status public.debt_status;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select * into v_debt
  from public.debts
  where id = p_debt_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'debt_not_found';
  end if;

  if v_debt.status = 'archived' then
    raise exception 'debt_archived';
  end if;

  v_pending := v_debt.original_amount - v_debt.paid_amount;
  if p_amount > v_pending then
    raise exception 'payment_exceeds_pending';
  end if;

  select * into v_account
  from public.financial_accounts
  where id = p_account_id and user_id = v_uid;

  if not found or v_account.status <> 'active' or v_account.nature <> 'asset' then
    raise exception 'invalid_payment_account';
  end if;

  v_balance := public.get_account_balance(p_account_id);
  if v_balance < p_amount then
    raise exception 'insufficient_funds';
  end if;

  if v_debt.linked_account_id is not null then
    select * into v_linked
    from public.financial_accounts
    where id = v_debt.linked_account_id and user_id = v_uid;

    if found and v_linked.nature = 'liability' and v_linked.status = 'active' then
      if v_linked.currency <> v_account.currency then
        raise exception 'currency_mismatch';
      end if;

      insert into public.transactions (
        user_id, type, amount, occurred_on, description, note,
        account_id, counterparty_account_id, transfer_group_id, is_settlement
      ) values (
        v_uid, 'transfer', p_amount, p_paid_on,
        'Pago deuda: ' || v_debt.name, nullif(trim(p_note), ''),
        p_account_id, v_linked.id, gen_random_uuid(), true
      )
      returning id into v_tx_id;
    end if;
  end if;

  if v_tx_id is null then
    -- No linked liability: reduce asset via settlement adjustment (not a consumption expense)
    insert into public.transactions (
      user_id, type, amount, occurred_on, description, note,
      account_id, adjustment_direction, adjustment_reason, is_settlement
    ) values (
      v_uid, 'adjustment', p_amount, p_paid_on,
      'Pago deuda: ' || v_debt.name, nullif(trim(p_note), ''),
      p_account_id, 'decrease',
      'Liquidación de deuda: ' || v_debt.name,
      true
    )
    returning id into v_tx_id;
  end if;

  insert into public.debt_payments (
    user_id, debt_id, amount, paid_on, transaction_id, note
  ) values (
    v_uid, p_debt_id, p_amount, p_paid_on, v_tx_id, nullif(trim(p_note), '')
  );

  v_paid := v_debt.paid_amount + p_amount;
  v_status := case
    when v_paid >= v_debt.original_amount then 'paid'::public.debt_status
    else 'active'::public.debt_status
  end;

  update public.debts
  set paid_amount = v_paid,
      status = v_status,
      next_payment_date = case
        when v_status = 'paid' then null
        else next_payment_date
      end
  where id = p_debt_id;

  return v_tx_id;
end;
$$;

revoke all on function public.pay_debt(uuid, uuid, numeric, date, text) from public;
grant execute on function public.pay_debt(uuid, uuid, numeric, date, text) to authenticated;

-- When a settlement transaction linked to a debt payment is deleted, reverse debt paid_amount
create or replace function public.reverse_debt_payment_on_tx_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.debt_payments%rowtype;
  v_debt public.debts%rowtype;
  v_new_paid numeric;
begin
  select * into v_payment
  from public.debt_payments
  where transaction_id = old.id;

  if not found then
    return old;
  end if;

  select * into v_debt from public.debts where id = v_payment.debt_id for update;
  if found then
    v_new_paid := greatest(0, v_debt.paid_amount - v_payment.amount);
    update public.debts
    set paid_amount = v_new_paid,
        status = case
          when v_new_paid <= 0 and status = 'paid' then 'active'::public.debt_status
          when v_new_paid < original_amount and status = 'paid' then 'active'::public.debt_status
          else status
        end
    where id = v_debt.id;
  end if;

  delete from public.debt_payments where id = v_payment.id;
  return old;
end;
$$;

drop trigger if exists transactions_reverse_debt_payment on public.transactions;
create trigger transactions_reverse_debt_payment
  before delete on public.transactions
  for each row execute function public.reverse_debt_payment_on_tx_delete();

-- Tighten reimbursement: must be income, same user, target must be expense
create or replace function public.validate_reimbursement()
returns trigger
language plpgsql
as $$
declare
  v_target public.transactions%rowtype;
begin
  if new.reimburses_transaction_id is null then
    return new;
  end if;

  if new.type <> 'income' then
    raise exception 'reimbursement_must_be_income';
  end if;

  select * into v_target
  from public.transactions
  where id = new.reimburses_transaction_id;

  if not found or v_target.user_id <> new.user_id then
    raise exception 'reimbursement_target_invalid';
  end if;

  if v_target.type <> 'expense' then
    raise exception 'reimbursement_target_must_be_expense';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_validate_reimbursement on public.transactions;
create trigger transactions_validate_reimbursement
  before insert or update on public.transactions
  for each row execute function public.validate_reimbursement();
