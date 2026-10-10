-- Optional name of our own team for a booking (shown as "Team vs Opponent").

alter table public.bookings
  add column if not exists team_name text;

alter table public.bookings
  drop constraint if exists bookings_team_name_len;

alter table public.bookings
  add constraint bookings_team_name_len check (team_name is null or char_length(team_name) <= 120);
