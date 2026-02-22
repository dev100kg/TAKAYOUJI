create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  night_start time not null default '20:00',
  night_end time not null default '06:00',
  recovery_menu jsonb not null default '[]'::jsonb,
  questions_enabled jsonb not null default '{}'::jsonb,
  questions_skip_holiday jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings
add column if not exists questions_skip_holiday jsonb not null default '{}'::jsonb;

create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  is_night boolean not null,
  answers jsonb not null,
  normalized jsonb not null,
  facts text,
  feelings text,
  actions text,
  flags jsonb not null,
  suggestions jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.recovery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  items jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_entries_user_date_idx on public.daily_entries(user_id, date desc);
create index if not exists recovery_logs_user_date_idx on public.recovery_logs(user_id, date desc);

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

drop trigger if exists daily_entries_set_updated_at on public.daily_entries;
create trigger daily_entries_set_updated_at
before update on public.daily_entries
for each row execute function public.set_updated_at();

drop trigger if exists recovery_logs_set_updated_at on public.recovery_logs;
create trigger recovery_logs_set_updated_at
before update on public.recovery_logs
for each row execute function public.set_updated_at();

alter table public.settings enable row level security;
alter table public.daily_entries enable row level security;
alter table public.recovery_logs enable row level security;

drop policy if exists settings_select_own on public.settings;
create policy settings_select_own on public.settings
for select using (auth.uid() = user_id);

drop policy if exists settings_insert_own on public.settings;
create policy settings_insert_own on public.settings
for insert with check (auth.uid() = user_id);

drop policy if exists settings_update_own on public.settings;
create policy settings_update_own on public.settings
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists settings_delete_own on public.settings;
create policy settings_delete_own on public.settings
for delete using (auth.uid() = user_id);

drop policy if exists daily_entries_select_own on public.daily_entries;
create policy daily_entries_select_own on public.daily_entries
for select using (auth.uid() = user_id);

drop policy if exists daily_entries_insert_own on public.daily_entries;
create policy daily_entries_insert_own on public.daily_entries
for insert with check (auth.uid() = user_id);

drop policy if exists daily_entries_update_own on public.daily_entries;
create policy daily_entries_update_own on public.daily_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists daily_entries_delete_own on public.daily_entries;
create policy daily_entries_delete_own on public.daily_entries
for delete using (auth.uid() = user_id);

drop policy if exists recovery_logs_select_own on public.recovery_logs;
create policy recovery_logs_select_own on public.recovery_logs
for select using (auth.uid() = user_id);

drop policy if exists recovery_logs_insert_own on public.recovery_logs;
create policy recovery_logs_insert_own on public.recovery_logs
for insert with check (auth.uid() = user_id);

drop policy if exists recovery_logs_update_own on public.recovery_logs;
create policy recovery_logs_update_own on public.recovery_logs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists recovery_logs_delete_own on public.recovery_logs;
create policy recovery_logs_delete_own on public.recovery_logs
for delete using (auth.uid() = user_id);
