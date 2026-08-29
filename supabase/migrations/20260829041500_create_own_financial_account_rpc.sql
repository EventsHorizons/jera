-- Reliable create/restore for financial accounts (auth.uid required)
create or replace function public.create_own_financial_account(
  p_name text,
  p_type public.account_type,
  p_institution text default null,
  p_currency text default 'USD',
  p_initial_balance numeric default 0
)
returns public.financial_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.financial_accounts;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_name is null or length(trim(p_name)) < 1 then
    raise exception 'invalid_name';
  end if;

  insert into public.financial_accounts (
    user_id, name, type, nature, institution, currency, initial_balance
  ) values (
    v_uid,
    trim(p_name),
    p_type,
    public.account_nature_for_type(p_type),
    nullif(trim(coalesce(p_institution, '')), ''),
    upper(trim(p_currency)),
    coalesce(p_initial_balance, 0)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_own_financial_account(text, public.account_type, text, text, numeric) from public;
grant execute on function public.create_own_financial_account(text, public.account_type, text, text, numeric) to authenticated;

create or replace function public.set_own_financial_account_status(
  p_id uuid,
  p_status public.account_status
)
returns public.financial_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.financial_accounts;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.financial_accounts
  set status = p_status
  where id = p_id
    and user_id = v_uid
  returning * into v_row;

  if v_row.id is null then
    raise exception 'account_not_found';
  end if;

  return v_row;
end;
$$;

revoke all on function public.set_own_financial_account_status(uuid, public.account_status) from public;
grant execute on function public.set_own_financial_account_status(uuid, public.account_status) to authenticated;
