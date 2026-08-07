import { and, desc, eq, ilike, isNull, notExists, or, sql } from "drizzle-orm";
import { db } from "../index";
import {
  taxiProviderUsers,
  taxiProviders,
  taxiRequestDeclines,
  taxiRideRequests,
  taxiVehicles,
} from "../schema";
import { generateBookingReference } from "@/lib/reference-code";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function createTaxiRideRequest(input: {
  pickupLocation: string;
  destination: string;
  pickupAt: Date;
  passengers: number;
  passengerName: string | null;
  passengerPhone: string;
  passengerEmail: string | null;
  notes: string | null;
  userId: number | null;
}) {
  const requestReference = `TX-${generateBookingReference()}`;
  await db.insert(taxiRideRequests).values({ ...input, requestReference });
  return requestReference;
}

export async function getTaxiRideRequestByReference(reference: string) {
  const [request] = await db
    .select({
      requestReference: taxiRideRequests.requestReference,
      pickupLocation: taxiRideRequests.pickupLocation,
      destination: taxiRideRequests.destination,
      pickupAt: taxiRideRequests.pickupAt,
      passengers: taxiRideRequests.passengers,
      quotedPrice: taxiRideRequests.quotedPrice,
      status: taxiRideRequests.status,
    })
    .from(taxiRideRequests)
    .where(eq(taxiRideRequests.requestReference, reference))
    .limit(1);
  return request ?? null;
}

export async function listTaxiRequestsForUser(userId: number) {
  return db
    .select({
      id: taxiRideRequests.id,
      requestReference: taxiRideRequests.requestReference,
      pickupLocation: taxiRideRequests.pickupLocation,
      destination: taxiRideRequests.destination,
      pickupAt: taxiRideRequests.pickupAt,
      passengers: taxiRideRequests.passengers,
      quotedPrice: taxiRideRequests.quotedPrice,
      status: taxiRideRequests.status,
      providerName: taxiProviders.name,
    })
    .from(taxiRideRequests)
    .leftJoin(taxiProviders, eq(taxiRideRequests.taxiProviderId, taxiProviders.id))
    .where(eq(taxiRideRequests.userId, userId))
    .orderBy(desc(taxiRideRequests.createdAt));
}

export async function getTaxiRequestForUser(userId: number, reference: string) {
  const [request] = await db
    .select({
      id: taxiRideRequests.id,
      requestReference: taxiRideRequests.requestReference,
      pickupLocation: taxiRideRequests.pickupLocation,
      destination: taxiRideRequests.destination,
      pickupAt: taxiRideRequests.pickupAt,
      passengers: taxiRideRequests.passengers,
      passengerName: taxiRideRequests.passengerName,
      passengerPhone: taxiRideRequests.passengerPhone,
      passengerEmail: taxiRideRequests.passengerEmail,
      notes: taxiRideRequests.notes,
      quotedPrice: taxiRideRequests.quotedPrice,
      status: taxiRideRequests.status,
      providerName: taxiProviders.name,
      providerPhone: taxiProviders.phone,
      vehicleMake: taxiVehicles.make,
      vehicleModel: taxiVehicles.model,
      plateNumber: taxiVehicles.plateNumber,
      driverName: taxiProviderUsers.name,
    })
    .from(taxiRideRequests)
    .leftJoin(taxiProviders, eq(taxiRideRequests.taxiProviderId, taxiProviders.id))
    .leftJoin(taxiVehicles, eq(taxiRideRequests.taxiVehicleId, taxiVehicles.id))
    .leftJoin(
      taxiProviderUsers,
      eq(taxiRideRequests.acceptedByTaxiProviderUserId, taxiProviderUsers.id)
    )
    .where(
      and(
        eq(taxiRideRequests.userId, userId),
        eq(taxiRideRequests.requestReference, reference)
      )
    )
    .limit(1);
  return request ?? null;
}

export async function cancelUserTaxiRequest(userId: number, requestId: number) {
  const [updated] = await db
    .update(taxiRideRequests)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(taxiRideRequests.id, requestId),
        eq(taxiRideRequests.userId, userId),
        or(eq(taxiRideRequests.status, "requested"), eq(taxiRideRequests.status, "accepted"))
      )
    )
    .returning({ id: taxiRideRequests.id });
  return Boolean(updated);
}

export type CreateTaxiProviderResult =
  | { ok: true }
  | { ok: false; error: "email_taken" };

export async function createTaxiProviderAccount(input: {
  providerName: string;
  contactName: string;
  email: string;
  password: string;
  phone: string;
  city: string;
}): Promise<CreateTaxiProviderResult> {
  const [existing] = await db
    .select({ id: taxiProviderUsers.id })
    .from(taxiProviderUsers)
    .where(eq(taxiProviderUsers.email, input.email))
    .limit(1);
  if (existing) return { ok: false, error: "email_taken" };

  await db.execute(sql`
    with provider as (
      insert into ${taxiProviders} (
        ${sql.identifier(taxiProviders.name.name)},
        ${sql.identifier(taxiProviders.phone.name)},
        ${sql.identifier(taxiProviders.email.name)},
        ${sql.identifier(taxiProviders.city.name)}
      )
      values (${input.providerName}, ${input.phone}, ${input.email}, ${input.city})
      returning ${taxiProviders.id}
    )
    insert into ${taxiProviderUsers} (
      ${sql.identifier(taxiProviderUsers.taxiProviderId.name)},
      ${sql.identifier(taxiProviderUsers.name.name)},
      ${sql.identifier(taxiProviderUsers.email.name)},
      ${sql.identifier(taxiProviderUsers.passwordHash.name)}
    )
    select ${sql.raw("id")}, ${input.contactName}, ${input.email}, ${hashPassword(input.password)}
    from provider
  `);
  return { ok: true };
}

export type TaxiProviderAuthResult =
  | { ok: true; id: number }
  | { ok: false; error: "invalid_credentials" | "pending_approval" | "rejected" };

export async function authenticateTaxiProvider(email: string, password: string): Promise<TaxiProviderAuthResult> {
  const [row] = await db
    .select({
      id: taxiProviderUsers.id,
      passwordHash: taxiProviderUsers.passwordHash,
      status: taxiProviders.status,
    })
    .from(taxiProviderUsers)
    .innerJoin(taxiProviders, eq(taxiProviderUsers.taxiProviderId, taxiProviders.id))
    .where(eq(taxiProviderUsers.email, email))
    .limit(1);
  if (!row || !verifyPassword(password, row.passwordHash)) return { ok: false, error: "invalid_credentials" };
  if (row.status === "pending") return { ok: false, error: "pending_approval" };
  if (row.status === "rejected") return { ok: false, error: "rejected" };
  return { ok: true, id: row.id };
}

export async function getTaxiProviderContext(userId: number) {
  const [row] = await db
    .select({
      userId: taxiProviderUsers.id,
      contactName: taxiProviderUsers.name,
      loginEmail: taxiProviderUsers.email,
      providerId: taxiProviders.id,
      providerName: taxiProviders.name,
      phone: taxiProviders.phone,
      email: taxiProviders.email,
      city: taxiProviders.city,
      status: taxiProviders.status,
    })
    .from(taxiProviderUsers)
    .innerJoin(taxiProviders, eq(taxiProviderUsers.taxiProviderId, taxiProviders.id))
    .where(eq(taxiProviderUsers.id, userId))
    .limit(1);
  return row ?? null;
}

export async function updateTaxiProviderProfile(
  userId: number,
  input: { name: string; phone: string; email: string | null; city: string }
) {
  const context = await getTaxiProviderContext(userId);
  if (!context || context.status !== "approved") return false;
  await db.update(taxiProviders).set({ ...input, updatedAt: new Date() }).where(eq(taxiProviders.id, context.providerId));
  return true;
}

export async function listTaxiProviderVehicles(userId: number) {
  const context = await getTaxiProviderContext(userId);
  if (!context) return [];
  return db.select().from(taxiVehicles).where(eq(taxiVehicles.taxiProviderId, context.providerId)).orderBy(desc(taxiVehicles.id));
}

export async function createTaxiVehicle(
  userId: number,
  input: { make: string; model: string; plateNumber: string; passengerCapacity: number }
) {
  const context = await getTaxiProviderContext(userId);
  if (!context || context.status !== "approved") return false;
  await db.insert(taxiVehicles).values({ taxiProviderId: context.providerId, ...input });
  return true;
}

export async function toggleTaxiVehicle(userId: number, vehicleId: number) {
  const context = await getTaxiProviderContext(userId);
  if (!context || context.status !== "approved") return false;
  const [vehicle] = await db
    .select({ active: taxiVehicles.active })
    .from(taxiVehicles)
    .where(and(eq(taxiVehicles.id, vehicleId), eq(taxiVehicles.taxiProviderId, context.providerId)))
    .limit(1);
  if (!vehicle) return false;
  await db.update(taxiVehicles).set({ active: !vehicle.active }).where(eq(taxiVehicles.id, vehicleId));
  return true;
}

export async function listTaxiRequestsForProvider(userId: number) {
  const context = await getTaxiProviderContext(userId);
  if (!context || context.status !== "approved") return [];
  const alreadyDeclined = db
    .select({ value: sql`1` })
    .from(taxiRequestDeclines)
    .where(
      and(
        eq(taxiRequestDeclines.taxiRideRequestId, taxiRideRequests.id),
        eq(taxiRequestDeclines.taxiProviderId, context.providerId)
      )
    );

  return db
    .select({
      id: taxiRideRequests.id,
      requestReference: taxiRideRequests.requestReference,
      pickupLocation: taxiRideRequests.pickupLocation,
      destination: taxiRideRequests.destination,
      pickupAt: taxiRideRequests.pickupAt,
      passengers: taxiRideRequests.passengers,
      passengerName: taxiRideRequests.passengerName,
      passengerPhone: taxiRideRequests.passengerPhone,
      notes: taxiRideRequests.notes,
      quotedPrice: taxiRideRequests.quotedPrice,
      status: taxiRideRequests.status,
      taxiProviderId: taxiRideRequests.taxiProviderId,
      taxiVehicleId: taxiRideRequests.taxiVehicleId,
    })
    .from(taxiRideRequests)
    .where(
      or(
        eq(taxiRideRequests.taxiProviderId, context.providerId),
        and(
          isNull(taxiRideRequests.taxiProviderId),
          eq(taxiRideRequests.status, "requested"),
          ilike(taxiRideRequests.pickupLocation, `%${context.city}%`),
          notExists(alreadyDeclined)
        )
      )
    )
    .orderBy(desc(taxiRideRequests.createdAt));
}

export async function acceptTaxiRequest(
  userId: number,
  input: { requestId: number; vehicleId: number; quotedPrice: string }
) {
  const context = await getTaxiProviderContext(userId);
  if (!context || context.status !== "approved") return false;
  const [request] = await db
    .select({ passengers: taxiRideRequests.passengers })
    .from(taxiRideRequests)
    .where(and(
      eq(taxiRideRequests.id, input.requestId),
      isNull(taxiRideRequests.taxiProviderId),
      eq(taxiRideRequests.status, "requested"),
      ilike(taxiRideRequests.pickupLocation, `%${context.city}%`)
    ))
    .limit(1);
  if (!request) return false;
  const [vehicle] = await db
    .select({ id: taxiVehicles.id })
    .from(taxiVehicles)
    .where(
      and(
        eq(taxiVehicles.id, input.vehicleId),
        eq(taxiVehicles.taxiProviderId, context.providerId),
        eq(taxiVehicles.active, true),
        sql`${taxiVehicles.passengerCapacity} >= ${request.passengers}`
      )
    )
    .limit(1);
  if (!vehicle) return false;
  const [updated] = await db
    .update(taxiRideRequests)
    .set({
      taxiProviderId: context.providerId,
      taxiVehicleId: vehicle.id,
      acceptedByTaxiProviderUserId: userId,
      quotedPrice: input.quotedPrice,
      status: "accepted",
      updatedAt: new Date(),
    })
    .where(and(eq(taxiRideRequests.id, input.requestId), isNull(taxiRideRequests.taxiProviderId), eq(taxiRideRequests.status, "requested")))
    .returning({ id: taxiRideRequests.id });
  return Boolean(updated);
}

export async function declineTaxiRequest(userId: number, requestId: number) {
  const context = await getTaxiProviderContext(userId);
  if (!context || context.status !== "approved") return false;
  const [request] = await db
    .select({ id: taxiRideRequests.id })
    .from(taxiRideRequests)
    .where(
      and(
        eq(taxiRideRequests.id, requestId),
        isNull(taxiRideRequests.taxiProviderId),
        eq(taxiRideRequests.status, "requested"),
        ilike(taxiRideRequests.pickupLocation, `%${context.city}%`)
      )
    )
    .limit(1);
  if (!request) return false;
  await db.insert(taxiRequestDeclines).values({ taxiRideRequestId: requestId, taxiProviderId: context.providerId }).onConflictDoNothing();
  return true;
}

export async function completeTaxiRequest(userId: number, requestId: number) {
  const context = await getTaxiProviderContext(userId);
  if (!context || context.status !== "approved") return false;
  const [updated] = await db
    .update(taxiRideRequests)
    .set({ status: "completed", updatedAt: new Date() })
    .where(and(eq(taxiRideRequests.id, requestId), eq(taxiRideRequests.taxiProviderId, context.providerId), eq(taxiRideRequests.status, "accepted")))
    .returning({ id: taxiRideRequests.id });
  return Boolean(updated);
}
