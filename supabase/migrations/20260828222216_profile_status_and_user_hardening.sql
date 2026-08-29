-- User account status for suspension / active lifecycle
create type public.profile_status as enum ('active', 'suspended');

alter table public.profiles
  add column status public.profile_status not null default 'active';

-- Users cannot change their own status via client updates
create or replace function public.profiles_protect_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and auth.uid() is not null
     and auth.role() = 'authenticated' then
    raise exception 'not_authorized';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_status
  before update on public.profiles
  for each row execute function public.profiles_protect_status();

-- Helper for app-layer checks
create or replace function public.is_profile_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and status = 'active'
  );
$$;

revoke all on function public.is_profile_active(uuid) from public;
grant execute on function public.is_profile_active(uuid) to authenticated;
