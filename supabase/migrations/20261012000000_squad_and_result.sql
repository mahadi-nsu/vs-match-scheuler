-- Squad list (player names) and match result for each booking.

alter table public.bookings
  add column if not exists squad          text[]   not null default '{}',
  add column if not exists our_score      smallint,
  add column if not exists opponent_score smallint;

alter table public.bookings
  drop constraint if exists bookings_squad_size,
  drop constraint if exists bookings_scores_valid;

alter table public.bookings
  add constraint bookings_squad_size check (
    cardinality(squad) <= 30
    and coalesce(char_length(array_to_string(squad, '')), 0) <= 30 * 60
  ),
  add constraint bookings_scores_valid check (
    (our_score is null and opponent_score is null)
    or (our_score between 0 and 99 and opponent_score between 0 and 99)
  );
