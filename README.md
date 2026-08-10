# Machine Status

A tiny crowdsourced status tracker for Pokémon card vending machines —
report a machine as working / broken / empty, and see the latest reported
status for every machine ID.

## Stack

React + Vite, Supabase (Postgres) as the backend. Same stack as SmartSched,
just scoped way down.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor in your project and run everything in `20260810000000_init.sql`.
3. In your Supabase project settings → API, copy your **Project URL** and
   **anon public key**.
4. Copy `.env.example` to `.env` and fill in those two values:
   ```
   cp .env.example .env
   ```
5. Install and run:
   ```
   npm install
   npm run dev
   ```

## How it works

- `machine_reports` is an append-only table — every report is a new row,
  no updates or deletes from the client.
- The dashboard groups reports by `machine_id` and shows only the most
  recent one per machine, so the "current status" is always just
  "whatever was last reported."
- RLS is on, with public insert + select — anyone can report, anyone can
  read. No auth, on purpose, to keep the friction near zero.

## Ideas if you keep going

- Geocode machine IDs to lat/lng so you can drop them on an actual map
  instead of a flat list.
- Auto-expire a "broken" status after N days if nobody re-confirms it,
  so stale reports don't stick around forever.
- Light rate-limiting (e.g. by browser fingerprint or a simple cooldown)
  to cut down on spam reports if this ever goes public.
