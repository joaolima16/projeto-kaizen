create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.kaizen_players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points numeric(10, 1) not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_kaizen_players_updated_at on public.kaizen_players;

create trigger set_kaizen_players_updated_at
before update on public.kaizen_players
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.kaizen_players enable row level security;

drop policy if exists "Profiles can read own role" on public.profiles;
create policy "Profiles can read own role"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Anyone can read kaizen ranking" on public.kaizen_players;
create policy "Anyone can read kaizen ranking"
on public.kaizen_players
for select
to anon, authenticated
using (true);

drop policy if exists "Only admins can insert kaizen players" on public.kaizen_players;
create policy "Only admins can insert kaizen players"
on public.kaizen_players
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Only admins can update kaizen players" on public.kaizen_players;
create policy "Only admins can update kaizen players"
on public.kaizen_players
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Only admins can delete kaizen players" on public.kaizen_players;
create policy "Only admins can delete kaizen players"
on public.kaizen_players
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- Depois de criar o usuario admin em Authentication > Users,
-- substitua o UUID abaixo pelo id do usuario criado.
-- insert into public.profiles (id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'admin');
