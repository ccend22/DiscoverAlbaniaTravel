// Integration tests against a real database -- this project has no
// dedicated test database (dev and prod share the one Neon instance), so
// these are opt-in only (RUN_DB_INTEGRATION_TESTS=true) and create/clean up
// their own disposable fixtures rather than running by default in CI. Run
// locally with:
//   RUN_DB_INTEGRATION_TESTS=true node --import tsx --test src/db/queries/mobile.integration.test.ts
//
// Scope is deliberately narrow: the safety-critical properties (one-time
// activation, refresh-token rotation invalidating the old token, ticket
// validation idempotency, sell idempotency-key replay) rather than
// re-verifying basic CRUD, which is lower risk and more obviously correct
// by inspection.
import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const RUN = process.env.RUN_DB_INTEGRATION_TESTS === "true";

test("mobile API integration (DB)", { skip: !RUN }, async (t) => {
  const { neon } = await import("@neondatabase/serverless");
  const { hashPassword } = await import("@/lib/password");
  const {
    createDeviceActivationCode,
    activateDevice,
    issueRefreshToken,
    verifyRefreshToken,
    rotateRefreshToken,
    getCachedIdempotentResponse,
    storeIdempotentResponse,
  } = await import("./mobile");
  const { validateTicketForVendor } = await import("./vendors");

  const sql = neon(process.env.DATABASE_URL!);
  const passwordHash = hashPassword("TestPass123!");
  let operatorId: number;
  let ownerId: number;
  let bookingId: number;
  const ticketToken = (await import("node:crypto")).randomBytes(24).toString("base64url");

  before(async () => {
    const [operator] = await sql`insert into operators (vat, name) values ('TEST-INTEG-VAT', 'Integration Test Operator') returning id`;
    operatorId = operator.id;
    const [owner] = await sql`
      insert into vendor_users (operator_id, email, password_hash, name, status, is_owner, permissions)
      values (${operatorId}, 'integ-owner@example.com', ${passwordHash}, 'Integ Owner', 'approved', true, '{}')
      returning id
    `;
    ownerId = owner.id;
    const stationRows = await sql`select id from stations order by id limit 2`;
    const [route] = await sql`insert into routes (code, long_name, operator_id) values ('INTEG-A', 'Integ Route', ${operatorId}) returning id`;
    const [dep] = await sql`
      insert into trip_departures (route_id, from_station_id, to_station_id, departure_time, arrival_time, duration_min, distance_km, weekdays, base_price, planned_seats, free_seats)
      values (${route.id}, ${stationRows[0].id}, ${stationRows[1].id}, '08:00', '10:00', 120, 100, '{1,2,3,4,5,6,7}', 10, 40, 38)
      returning id
    `;
    const [booking] = await sql`
      insert into bookings (trip_departure_id, travel_date, passenger_name, passenger_phone, seats, price_at_booking, status, channel, booking_reference, ticket_token)
      values (${dep.id}, current_date, 'Integ Passenger', '+355690000000', 1, 10, 'confirmed', 'walk_in', 'DA-INTEGTEST', ${ticketToken})
      returning id
    `;
    bookingId = booking.id;
    await sql`insert into payments (booking_id, amount, currency, status, provider) values (${bookingId}, 10, 'EUR', 'paid', 'manual')`;
  });

  after(async () => {
    await sql`delete from mobile_idempotency_keys where vendor_user_id = ${ownerId}`;
    await sql`delete from payments where booking_id = ${bookingId}`;
    await sql`delete from bookings where id = ${bookingId}`;
    await sql`delete from device_refresh_tokens where device_id in (select id from devices where operator_id = ${operatorId})`;
    await sql`delete from devices where operator_id = ${operatorId}`;
    await sql`delete from trip_departures where route_id in (select id from routes where operator_id = ${operatorId})`;
    await sql`delete from routes where operator_id = ${operatorId}`;
    await sql`delete from vendor_users where operator_id = ${operatorId}`;
    await sql`delete from operators where id = ${operatorId}`;
  });

  await t.test("an activation code can only be used once", async () => {
    const created = await createDeviceActivationCode(ownerId, "Integ Device");
    assert.ok(created.ok);
    if (!created.ok) return;

    const first = await activateDevice(created.code, "install-1");
    assert.equal(first.ok, true);

    const second = await activateDevice(created.code, "install-2");
    assert.equal(second.ok, false);
  });

  await t.test("refresh token rotation invalidates the old token", async () => {
    const created = await createDeviceActivationCode(ownerId, "Integ Device 2");
    assert.ok(created.ok);
    if (!created.ok) return;
    const activated = await activateDevice(created.code, "install-3");
    assert.ok(activated.ok);
    if (!activated.ok) return;

    const issued = await issueRefreshToken(activated.deviceId, ownerId);
    const verified = await verifyRefreshToken(issued.token);
    assert.equal(verified.ok, true);
    if (!verified.ok) return;

    await rotateRefreshToken(verified.tokenRowId, verified.deviceId, verified.vendorUserId);

    const reverified = await verifyRefreshToken(issued.token);
    assert.equal(reverified.ok, false);
    if (reverified.ok) return;
    assert.equal(reverified.error, "revoked");
  });

  await t.test("validating the same ticket twice yields valid then already_used, never double-checking-in", async () => {
    const first = await validateTicketForVendor(ownerId, `DAT1:${ticketToken}`);
    assert.match(first.status, /^valid/);
    assert.ok("checkedInAt" in first && first.checkedInAt);

    const second = await validateTicketForVendor(ownerId, `DAT1:${ticketToken}`);
    assert.equal(second.status, "already_used");

    // Checked in exactly once -- the redundant second call reports the same
    // original timestamp rather than overwriting it with a new one.
    if ("checkedInAt" in first && "checkedInAt" in second) {
      assert.equal(second.checkedInAt, first.checkedInAt);
    }
  });

  await t.test("the idempotency cache replays the first response instead of re-executing", async () => {
    const key = `test-key-${Date.now()}`;
    assert.equal(await getCachedIdempotentResponse(key), null);

    await storeIdempotentResponse(key, ownerId, "tickets/sell", 200, { bookingId: 123 });
    const cached = await getCachedIdempotentResponse(key);
    assert.deepEqual(cached, { status: 200, body: { bookingId: 123 } });

    // A second store with the same key is a no-op (ON CONFLICT DO NOTHING) --
    // confirms the cache can't be silently overwritten by a later call.
    await storeIdempotentResponse(key, ownerId, "tickets/sell", 200, { bookingId: 999 });
    const stillCached = await getCachedIdempotentResponse(key);
    assert.deepEqual(stillCached, { status: 200, body: { bookingId: 123 } });
  });
});
