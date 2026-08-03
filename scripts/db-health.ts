import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const query = neon(process.env.DATABASE_URL);
const expectedTables = [
  "admin_users",
  "blog_posts",
  "bookings",
  "destinations",
  "operators",
  "payments",
  "routes",
  "stations",
  "taxi_provider_users",
  "taxi_providers",
  "taxi_request_declines",
  "taxi_ride_requests",
  "taxi_vehicles",
  "trip_departures",
  "trip_inventories",
  "users",
  "vendor_users",
] as const;

const [database] = await query`
  select current_database() as database_name,
    current_schema() as current_schema,
    current_setting('server_version') as server_version
`;
const tableRows = await query`
  select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name
`;
const publicTables = tableRows.map((row) => String(row.table_name));
const missingTables = expectedTables.filter((name) => !publicTables.includes(name));
const unexpectedTables = publicTables.filter(
  (name) => !expectedTables.includes(name as (typeof expectedTables)[number])
);

const [migrationTable] = await query`
  select to_regclass('drizzle.__drizzle_migrations')::text as table_name
`;
const migrations = migrationTable?.table_name
  ? await query`select id, hash, created_at from drizzle.__drizzle_migrations order by created_at`
  : [];
const counts = await Promise.all(
  expectedTables
    .filter((name) => publicTables.includes(name))
    .map(async (name) => {
      const rows = await query.query(`select count(*)::int as row_count from "${name}"`);
      return { table_name: name, row_count: Number(rows[0]?.row_count ?? 0) };
    })
);

if (missingTables.length > 0) {
  console.error(JSON.stringify({ database, publicTables, missingTables, unexpectedTables, counts, migrations }, null, 2));
  process.exit(1);
}

const weekdayCoverage = await query`
  select day::int, count(*)::int as departure_count
  from trip_departures cross join lateral unnest(weekdays) as day
  group by day order by day
`;
const [quality] = await query`
  select
    (select count(*)::int from trip_departures where from_station_id = to_station_id) as same_station_departures,
    (select count(*)::int from trip_departures where coalesce(array_length(weekdays, 1), 0) = 0) as departures_without_weekdays,
    (select count(*)::int from trip_departures where exists (
      select 1 from unnest(weekdays) as day where day < 1 or day > 7
    )) as departures_with_invalid_weekdays,
    (select count(*)::int from trip_departures where planned_seats < 0 or free_seats < 0 or free_seats > planned_seats) as invalid_departure_seats,
    (select count(*)::int from bookings where seats < 1 or seats > 9) as invalid_booking_seats,
    (select count(*)::int from trip_inventories where total_seats < 0 or available_seats < 0 or available_seats > total_seats) as invalid_inventory_seats,
    (select count(*)::int from payments where amount < 0 or num_nonnulls(booking_id, taxi_ride_request_id) <> 1) as invalid_payments,
    (select count(*)::int from users where lower(email) <> email) as non_normalized_user_emails,
    (select count(*)::int from vendor_users where lower(email) <> email) as non_normalized_vendor_emails,
    (select count(*)::int from admin_users where lower(email) <> email) as non_normalized_admin_emails
`;
const [orphans] = await query`
  select
    (select count(*)::int from routes r left join operators o on o.id = r.operator_id where o.id is null) as routes_without_operator,
    (select count(*)::int from trip_departures td left join routes r on r.id = td.route_id where r.id is null) as departures_without_route,
    (select count(*)::int from bookings b left join trip_departures td on td.id = b.trip_departure_id where td.id is null) as bookings_without_departure,
    (select count(*)::int from vendor_users vu left join operators o on o.id = vu.operator_id where o.id is null) as vendors_without_operator,
    (select count(*)::int from operators o left join vendor_users vu on vu.operator_id = o.id where vu.id is null) as operators_without_vendor,
    (select count(*)::int from trip_inventories ti left join trip_departures td on td.id = ti.trip_departure_id where td.id is null) as inventories_without_departure
`;
const duplicates = await query`
  select duplicate_type, duplicate_count from (
    select 'route_code' as duplicate_type, count(*)::int as duplicate_count
      from (select code from routes group by code having count(*) > 1) rows
    union all select 'station_code', count(*)::int
      from (select code from stations group by code having count(*) > 1) rows
    union all select 'booking_reference', count(*)::int
      from (select booking_reference from bookings group by booking_reference having count(*) > 1) rows
    union all select 'departure_natural_key', count(*)::int from (
      select route_id, from_station_id, to_station_id, departure_time
      from trip_departures group by route_id, from_station_id, to_station_id, departure_time
      having count(*) > 1
    ) rows
  ) checks order by duplicate_type
`;
const [bookingInventory] = await query`
  select
    count(*) filter (where expected_available < 0)::int as oversold_inventory_rows,
    count(*) filter (where available_seats <> greatest(expected_available, 0))::int as inventory_mismatches
  from (
    select ti.available_seats,
      ti.total_seats - coalesce(sum(b.seats) filter (where b.status = 'confirmed'), 0) as expected_available
    from trip_inventories ti left join bookings b
      on b.trip_departure_id = ti.trip_departure_id and b.travel_date = ti.travel_date
    group by ti.id, ti.available_seats, ti.total_seats
  ) inventory
`;

console.log(JSON.stringify({
  database,
  publicTables,
  missingTables,
  unexpectedTables,
  counts,
  migrations,
  weekdayCoverage,
  quality,
  orphans,
  duplicates,
  bookingInventory,
}, null, 2));
