import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { operators, routes, stations, tripDepartures, vendorUsers } from "../schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isUniqueViolation } from "./db-errors";

export type AdminMutationResult = { ok: true } | { ok: false; error: string };

export type AuthenticateVendorResult =
  | { ok: true; id: number }
  | { ok: false; error: "invalid_credentials" | "pending_approval" | "rejected" };

export async function authenticateVendor(
  email: string,
  password: string
): Promise<AuthenticateVendorResult> {
  const [vendor] = await db
    .select({
      id: vendorUsers.id,
      passwordHash: vendorUsers.passwordHash,
      status: vendorUsers.status,
    })
    .from(vendorUsers)
    .where(eq(vendorUsers.email, email.toLowerCase()))
    .limit(1);

  if (!vendor || !verifyPassword(password, vendor.passwordHash)) {
    return { ok: false, error: "invalid_credentials" };
  }
  if (vendor.status === "pending") return { ok: false, error: "pending_approval" };
  if (vendor.status === "rejected") return { ok: false, error: "rejected" };
  return { ok: true, id: vendor.id };
}

export async function isApprovedVendorUser(vendorUserId: number): Promise<boolean> {
  const [vendor] = await db
    .select({ id: vendorUsers.id })
    .from(vendorUsers)
    .where(and(eq(vendorUsers.id, vendorUserId), eq(vendorUsers.status, "approved")))
    .limit(1);
  return Boolean(vendor);
}

export async function getVendorContext(vendorUserId: number) {
  const [row] = await db
    .select({
      vendorUserId: vendorUsers.id,
      vendorName: vendorUsers.name,
      vendorEmail: vendorUsers.email,
      vendorStatus: vendorUsers.status,
      operatorId: operators.id,
      operatorName: operators.name,
      operatorPhone: operators.phone,
      operatorEmail: operators.email,
      operatorStreet: operators.street,
      operatorCity: operators.city,
      operatorRating: operators.rating,
      operatorRatingCount: operators.ratingCount,
    })
    .from(vendorUsers)
    .innerJoin(operators, eq(vendorUsers.operatorId, operators.id))
    .where(eq(vendorUsers.id, vendorUserId))
    .limit(1);

  return row ?? null;
}

export async function updateVendorOperator(
  vendorUserId: number,
  input: { name: string; phone: string | null; email: string | null; street: string | null; city: string | null }
) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;

  await db
    .update(operators)
    .set(input)
    .where(eq(operators.id, context.operatorId));
  return true;
}

export async function listVendorDepartures(vendorUserId: number) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];

  return db
    .select({
      id: tripDepartures.id,
      routeCode: routes.code,
      routeLongName: routes.longName,
      fromStationName: stations.name,
      departureTime: tripDepartures.departureTime,
      arrivalTime: tripDepartures.arrivalTime,
      durationMin: tripDepartures.durationMin,
      distanceKm: tripDepartures.distanceKm,
      weekdays: tripDepartures.weekdays,
      basePrice: tripDepartures.basePrice,
      plannedSeats: tripDepartures.plannedSeats,
      freeSeats: tripDepartures.freeSeats,
      canBoard: tripDepartures.canBoard,
    })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .innerJoin(stations, eq(tripDepartures.fromStationId, stations.id))
    .where(eq(routes.operatorId, context.operatorId))
    .orderBy(asc(routes.code), asc(tripDepartures.departureTime));
}

export async function listVendorRoutes(vendorUserId: number) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return [];
  return db
    .select({ id: routes.id, code: routes.code, longName: routes.longName })
    .from(routes)
    .where(eq(routes.operatorId, context.operatorId))
    .orderBy(asc(routes.code));
}

export async function listStationOptions() {
  return db
    .select({ id: stations.id, name: stations.name, city: stations.city })
    .from(stations)
    .orderBy(asc(stations.city), asc(stations.name));
}

export async function createVendorRoute(
  vendorUserId: number,
  input: { code: string; longName: string }
) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;
  await db.insert(routes).values({
    operatorId: context.operatorId,
    code: input.code.toUpperCase(),
    longName: input.longName,
  });
  return true;
}

export async function createVendorDeparture(
  vendorUserId: number,
  input: {
    routeId: number;
    fromStationId: number;
    toStationId: number;
    departureTime: string;
    arrivalTime: string;
    durationMin: string;
    distanceKm: string;
    basePrice: string;
    plannedSeats: number;
    weekdays: number[];
  }
) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;
  const [ownedRoute] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, input.routeId), eq(routes.operatorId, context.operatorId)))
    .limit(1);
  if (!ownedRoute) return false;
  await db.insert(tripDepartures).values({
    ...input,
    freeSeats: input.plannedSeats,
    canBoard: true,
  });
  return true;
}

export async function updateVendorDeparture(
  vendorUserId: number,
  input: {
    tripDepartureId: number;
    departureTime: string;
    arrivalTime: string;
    basePrice: string;
    plannedSeats: number;
    freeSeats: number;
    canBoard: boolean;
    weekdays: number[];
  }
) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") return false;

  const [ownedDeparture] = await db
    .select({ id: tripDepartures.id })
    .from(tripDepartures)
    .innerJoin(routes, eq(tripDepartures.routeId, routes.id))
    .where(and(eq(tripDepartures.id, input.tripDepartureId), eq(routes.operatorId, context.operatorId)))
    .limit(1);

  if (!ownedDeparture) return false;

  await db
    .update(tripDepartures)
    .set({
      departureTime: input.departureTime,
      arrivalTime: input.arrivalTime,
      basePrice: input.basePrice,
      plannedSeats: input.plannedSeats,
      freeSeats: input.freeSeats,
      canBoard: input.canBoard,
      weekdays: input.weekdays,
    })
    .where(eq(tripDepartures.id, input.tripDepartureId));

  return true;
}

export interface PendingVendor {
  id: number;
  name: string;
  email: string;
  operatorName: string;
  createdAt: Date;
}

export async function listPendingVendors(): Promise<PendingVendor[]> {
  return db
    .select({
      id: vendorUsers.id,
      name: vendorUsers.name,
      email: vendorUsers.email,
      operatorName: operators.name,
      createdAt: vendorUsers.createdAt,
    })
    .from(vendorUsers)
    .innerJoin(operators, eq(vendorUsers.operatorId, operators.id))
    .where(eq(vendorUsers.status, "pending"))
    .orderBy(asc(vendorUsers.createdAt));
}

export async function setVendorStatus(
  vendorUserId: number,
  status: "approved" | "rejected"
): Promise<void> {
  await db
    .update(vendorUsers)
    .set({ status, updatedAt: new Date() })
    .where(eq(vendorUsers.id, vendorUserId));
}

export interface AdminVendorUserRow {
  id: number;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  operatorName: string;
  createdAt: Date;
}

export async function listAllVendorUsersForAdmin(): Promise<AdminVendorUserRow[]> {
  return db
    .select({
      id: vendorUsers.id,
      name: vendorUsers.name,
      email: vendorUsers.email,
      status: vendorUsers.status,
      operatorName: operators.name,
      createdAt: vendorUsers.createdAt,
    })
    .from(vendorUsers)
    .innerJoin(operators, eq(vendorUsers.operatorId, operators.id))
    .orderBy(desc(vendorUsers.createdAt));
}

export async function updateVendorUserForAdmin(
  vendorUserId: number,
  input: { name: string; email: string; password?: string }
): Promise<AdminMutationResult> {
  try {
    await db
      .update(vendorUsers)
      .set({
        name: input.name,
        email: input.email,
        ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(vendorUsers.id, vendorUserId));
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That email is already in use." };
    throw error;
  }
}

export async function deleteVendorUserForAdmin(vendorUserId: number): Promise<AdminMutationResult> {
  await db.delete(vendorUsers).where(eq(vendorUsers.id, vendorUserId));
  return { ok: true };
}

export interface AdminOperatorRow {
  id: number;
  name: string;
  vat: string;
  city: string | null;
  phone: string | null;
  routeCount: number;
}

export async function listAllOperators(): Promise<AdminOperatorRow[]> {
  const rows = await db
    .select({
      id: operators.id,
      name: operators.name,
      vat: operators.vat,
      city: operators.city,
      phone: operators.phone,
      routeCount: sql<number>`count(${routes.id})`,
    })
    .from(operators)
    .leftJoin(routes, eq(routes.operatorId, operators.id))
    .groupBy(operators.id)
    .orderBy(asc(operators.name));

  return rows.map((row) => ({ ...row, routeCount: Number(row.routeCount) }));
}
