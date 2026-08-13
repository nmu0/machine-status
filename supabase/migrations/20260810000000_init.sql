-- Adds a machines table so machine IDs have a place to plot on a map.
-- machine_reports stays exactly as-is; this just gives each machine_id
-- a name/address/lat/lng to render a marker for.

create table if not exists machines (
                                        machine_id text primary key,
                                        name text not null,
                                        address text,
                                        lat double precision not null,
                                        lng double precision not null,
                                        created_at timestamptz not null default now()
    );

alter table machines enable row level security;

create policy "Anyone can read machines"
  on machines for select
                             using (true);

create policy "Anyone can add a machine"
  on machines for insert
  with check (true);

-- Seed data pulled from the locator screenshots. Coordinates are
-- approximate (eyeballed from the address, not precisely geocoded) --
-- good enough to plot a pin, worth tightening up with a real geocoder
-- later if this becomes more than a fun project.
insert into machines (machine_id, name, address, lat, lng) values
                                                               ('Q00173', 'Safeway', '4301 212th St SW, Mountlake Terrace, WA', 47.7929, -122.3068),
                                                               ('Q00165', 'Fred Meyer', '4615 196th St SW, Lynnwood, WA', 47.8306, -122.3151),
                                                               ('Q01302', 'Safeway', '19500 Hwy 99, Lynnwood, WA', 47.8459, -122.2916),
                                                               ('Q01297', 'WinCo Foods', '21900 Hwy 99, Edmonds, WA', 47.8267, -122.3178)
    on conflict (machine_id) do nothing;