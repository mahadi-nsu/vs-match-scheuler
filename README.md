# Khelar · Match Planner

A small, mobile-first planner for our indoor football bookings. We record the slots we've booked with venues, so nobody double-books or forgets a booking. The app doesn't book anything with the venues.

Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase Postgres. It needs no other backend or state library.

## How it works

- **No login:** anyone with the app's link can view, add, edit, cancel and delete bookings. Keep the link within the team. Each booking records **Booked by** as a typed name. Mahadi and Shorup are one-tap suggestions, and each device remembers the last name used.
- **Data access:** all reads (`GET /api/bookings`) and writes (Server Actions in `src/app/actions.ts`) run on the server with the publishable key. The browser never talks to Supabase directly. Database policies allow read, insert, update and delete.
- **Time:** everything is entered and shown in **Asia/Dhaka**, converted explicitly with `Intl` (`src/lib/time.ts`), and stored as `timestamptz`. The device's own time zone is never used.
- **Squad and result:** each booking can hold a player list (up to 30, with past players offered as one-tap suggestions) and a score. Win, draw or loss is worked out from the score. Both show in the details, the list, and the copied match details.
- **Concurrency:** edits and cancellations only apply if `updated_at` still matches what you loaded. If someone else changed the booking, you're asked to load the latest version.

## Setup

1. **Create the table.** In Supabase, go to **SQL Editor**. Run each file in [`supabase/migrations/`](supabase/migrations/), oldest first:
   - `20261011000000_bookings.sql` creates the table, constraints, the `start_at` index, the timestamp trigger and the access policies.
   - `20261012000000_squad_and_result.sql` adds the squad list and the match result.
   - `20261013000000_allow_delete.sql` allows deleting bookings.
2. **Configure the app:**

   ```bash
   cp .env.example .env.local   # fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
   npm install
   npm run dev                  # http://localhost:3000
   ```

   - Both values are in Supabase under **Project Settings → API**.
   - The app doesn't need the secret or `service_role` key.
   - If a value is missing, the app shows a "Not connected to Supabase" screen rather than any data.
3. **Deploy (e.g. Vercel).** Set the same two environment variables in the host. Don't commit `.env.local`, because `.gitignore` excludes it.

To change the suggested names, edit [`src/config/bookers.ts`](src/config/bookers.ts). Any name can still be typed. Known names are matched regardless of case, so "mahadi" is saved as "Mahadi".

## Scripts

| Command         | What it does                                         |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | Start the dev server                                 |
| `npm run build` | Production build                                     |
| `npm run check` | Type check, lint and unit tests                      |
| `npm test`      | Unit tests: time zones, validation, overlaps, squad, result |

## Local Supabase (optional)

With Docker running:

```bash
npx supabase start
```

This applies the migration. Point `.env.local` at the local URL and publishable key printed by `npx supabase status`.

## Notes

- **Cancel or delete:** **Cancel** moves a booking to the Cancelled tab, and **Edit / restore** brings it back. **Delete** removes it permanently after a confirmation, and can't be undone.
- **"Past":** a booking is Past once its end time has passed. That doesn't mean the match was played.
- **Overlaps:** overlap checks ignore cancelled bookings. Back-to-back slots are not overlaps. A warning can be overridden on purpose with **Save anyway**. Editing only the squad, result or notes doesn't warn again.
- **Updates:** there are no realtime updates. The dashboard refetches when it loads, when the window regains focus, after every change, and when you tap the refresh button.
