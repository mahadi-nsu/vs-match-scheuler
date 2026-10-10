-- Allow permanently deleting a booking (the app asks for confirmation first).

grant delete on table public.bookings to anon, authenticated;

drop policy if exists "Anyone with the app can delete bookings" on public.bookings;
create policy "Anyone with the app can delete bookings"
  on public.bookings for delete
  to anon, authenticated
  using (true);
