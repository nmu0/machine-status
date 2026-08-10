-- Run this in the Supabase SQL editor for your project.

create table if not exists machine_reports (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null,
  status text not null check (status in ('working', 'broken', 'empty')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists machine_reports_machine_id_idx
  on machine_reports (machine_id);

create index if not exists machine_reports_created_at_idx
  on machine_reports (created_at desc);

-- Row Level Security: this is a public, crowdsourced tool, so anyone
-- can read all reports and submit a new one. No updates/deletes from
-- the client — status "changes" are just newer rows.
alter table machine_reports enable row level security;

create policy "Anyone can read reports"
  on machine_reports for select
  using (true);

create policy "Anyone can submit a report"
  on machine_reports for insert
  with check (true);
