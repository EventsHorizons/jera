-- Global reporting currency for each user
alter table public.profiles
  add column if not exists base_currency char(3) not null default 'USD';

alter table public.profiles
  drop constraint if exists profiles_base_currency_format_check;

alter table public.profiles
  add constraint profiles_base_currency_format_check
  check (base_currency ~ '^[A-Z]{3}$');
