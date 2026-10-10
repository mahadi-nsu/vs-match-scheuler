-- Khelar match planner: bookings table, constraints, RLS and updated_at handling.
--
-- There is no login: the app's server talks to the database with the
-- publishable key. Bookings can be read, added and updated, never deleted.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  venue_name    text not null,
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  booked_by     text not null,
  status        text not null default 'confirmed',
  opponent_name text,
  total_cost    numeric(12, 2),
  advance_paid  numeric(12, 2),
  contact_phone text,
  map_url       text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint bookings_venue_name_len    check (char_length(btrim(venue_name)) between 1 and 120),
  constraint bookings_booked_by_len     check (char_length(btrim(booked_by)) between 1 and 60),
  constraint bookings_status_valid      check (status in ('pending', 'confirmed', 'cancelled')),
  constraint bookings_end_after_start   check (end_at > start_at),
  constraint bookings_max_duration      check (end_at - start_at <= interval '24 hours'),
  constraint bookings_opponent_len      check (opponent_name is null or char_length(opponent_name) <= 120),
  constraint bookings_total_nonneg      check (total_cost is null or total_cost >= 0),
  constraint bookings_advance_nonneg    check (advance_paid is null or advance_paid >= 0),
  constraint bookings_advance_le_total  check (advance_paid is null or total_cost is null or advance_paid <= total_cost),
  constraint bookings_phone_len         check (contact_phone is null or char_length(contact_phone) <= 40),
  constraint bookings_map_url_http      check (map_url is null or (map_url ~* '^https?://' and char_length(map_url) <= 2048)),
  constraint bookings_notes_len         check (notes is null or char_length(notes) <= 2000)
);

create index if not exists bookings_start_at_idx on public.bookings (start_at);

-- ---------------------------------------------------------------------------
-- Timestamps: the database owns created_at / updated_at.
-- updated_at doubles as the optimistic-concurrency token, so it uses
-- clock_timestamp() to change on every write.
-- ---------------------------------------------------------------------------
create or replace function public.bookings_set_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists bookings_set_timestamps on public.bookings;
create trigger bookings_set_timestamps
  before insert or update on public.bookings
  for each row execute function public.bookings_set_timestamps();

-- ---------------------------------------------------------------------------
-- Row Level Security: read, add and update are allowed (no login in this app).
-- There is no DELETE grant or policy, so bookings can only be cancelled.
-- ---------------------------------------------------------------------------
alter table public.bookings enable row level security;

revoke all on table public.bookings from anon, authenticated;
grant select, insert, update on table public.bookings to anon, authenticated;

drop policy if exists "Anyone with the app can read bookings" on public.bookings;
create policy "Anyone with the app can read bookings"
  on public.bookings for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone with the app can add bookings" on public.bookings;
create policy "Anyone with the app can add bookings"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone with the app can update bookings" on public.bookings;
create policy "Anyone with the app can update bookings"
  on public.bookings for update
  to anon, authenticated
  using (true)
  with check (true);
