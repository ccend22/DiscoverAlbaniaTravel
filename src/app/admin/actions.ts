"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminLoginSchema } from "@/lib/validation";
import { resolveOperatorReportForAdmin } from "@/db/queries/reviews";
import {
  vendorDepartureSchema,
  vendorOperatorSchema,
  vendorRouteSchema,
  vendorNewDepartureSchema,
  adminOperatorCreateSchema,
  adminTravelerEditSchema,
  adminVendorUserEditSchema,
} from "@/lib/validation";
import {
  authenticateAdmin,
  setUserStatus,
  updateDepartureForAdmin,
  updateOperatorForAdmin,
  updateRouteForAdmin,
  updateTaxiRequestStatusForAdmin,
  createOperatorForAdmin,
  deleteOperatorForAdmin,
  createRouteForAdmin,
  deleteRouteForAdmin,
  createDepartureForAdmin,
  deleteDepartureForAdmin,
  deleteBookingForAdmin,
  deletePaymentForAdmin,
  deleteTaxiRequestForAdmin,
  updateUserForAdmin,
  deleteUserForAdmin,
} from "@/db/queries/admin";
import { setVendorStatus, updateVendorUserForAdmin, deleteVendorUserForAdmin } from "@/db/queries/vendors";
import { setAdminSession, clearAdminSession, requireAdminSession } from "@/lib/admin-session";

export async function loginAdminAction(formData: FormData) {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your details and try again.";
    redirect(`/admin/login?error=${encodeURIComponent(message)}`);
  }

  const admin = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!admin) {
    redirect("/admin/login?error=Invalid%20email%20or%20password");
  }

  await setAdminSession(admin.id);
  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function approveVendorAction(formData: FormData) {
  await requireAdminSession();
  const vendorUserId = Number(formData.get("vendorUserId"));
  await setVendorStatus(vendorUserId, "approved");
  revalidatePath("/admin/vendors");
  redirect("/admin/vendors?saved=1");
}

export async function rejectVendorAction(formData: FormData) {
  await requireAdminSession();
  const vendorUserId = Number(formData.get("vendorUserId"));
  await setVendorStatus(vendorUserId, "rejected");
  revalidatePath("/admin/vendors");
  redirect("/admin/vendors?saved=1");
}

export async function updateVendorUserAction(formData: FormData) {
  await requireAdminSession();
  const vendorUserId = Number(formData.get("vendorUserId"));
  const parsed = adminVendorUserEditSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || "",
  });
  if (!parsed.success) {
    redirect(`/admin/vendors/all?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid vendor")}`);
  }
  const result = await updateVendorUserForAdmin(vendorUserId, {
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password || undefined,
  });
  if (!result.ok) redirect(`/admin/vendors/all?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/vendors/all");
  redirect("/admin/vendors/all?saved=1");
}

export async function deleteVendorUserAction(formData: FormData) {
  await requireAdminSession();
  const vendorUserId = Number(formData.get("vendorUserId"));
  await deleteVendorUserForAdmin(vendorUserId);
  revalidatePath("/admin/vendors/all");
  redirect("/admin/vendors/all?saved=1");
}

export async function updateTaxiRequestStatusAction(formData: FormData) {
  await requireAdminSession();
  const value = String(formData.get("status"));
  if (
    value !== "requested" &&
    value !== "accepted" &&
    value !== "declined" &&
    value !== "cancelled" &&
    value !== "completed"
  ) {
    redirect("/admin/taxi-requests?error=Invalid%20status");
  }
  await updateTaxiRequestStatusForAdmin(Number(formData.get("requestId")), value);
  revalidatePath("/admin/taxi-requests");
  redirect("/admin/taxi-requests?saved=1");
}

export async function deleteTaxiRequestAction(formData: FormData) {
  await requireAdminSession();
  const requestId = Number(formData.get("requestId"));
  const result = await deleteTaxiRequestForAdmin(requestId);
  if (!result.ok) redirect(`/admin/taxi-requests?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/taxi-requests");
  redirect("/admin/taxi-requests?saved=1");
}

export async function setUserStatusAction(formData: FormData) {
  await requireAdminSession();
  const status = String(formData.get("status"));
  if (status !== "active" && status !== "suspended") redirect("/admin/users?error=Invalid%20status");
  await setUserStatus(Number(formData.get("userId")), status);
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function updateTravelerAction(formData: FormData) {
  await requireAdminSession();
  const userId = Number(formData.get("userId"));
  const parsed = adminTravelerEditSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    redirect(`/admin/users?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid traveler")}`);
  }
  const result = await updateUserForAdmin(userId, {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: optionalString(formData.get("phone")),
  });
  if (!result.ok) redirect(`/admin/users?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function deleteTravelerAction(formData: FormData) {
  await requireAdminSession();
  const userId = Number(formData.get("userId"));
  await deleteUserForAdmin(userId);
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export async function createAdminOperatorAction(formData: FormData) {
  await requireAdminSession();
  const parsed = adminOperatorCreateSchema.safeParse({
    name: formData.get("name"),
    vat: formData.get("vat"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    street: formData.get("street"),
    city: formData.get("city"),
  });
  if (!parsed.success) {
    redirect(`/admin/operators/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid operator")}`);
  }
  const result = await createOperatorForAdmin({
    name: parsed.data.name,
    vat: parsed.data.vat,
    phone: optionalString(formData.get("phone")),
    email: optionalString(formData.get("email")),
    street: optionalString(formData.get("street")),
    city: optionalString(formData.get("city")),
  });
  if (!result.ok) redirect(`/admin/operators/new?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/operators");
  redirect(`/admin/operators/${result.operatorId}?saved=operator`);
}

export async function deleteAdminOperatorAction(formData: FormData) {
  await requireAdminSession();
  const operatorId = Number(formData.get("operatorId"));
  const result = await deleteOperatorForAdmin(operatorId);
  if (!result.ok) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/operators");
  redirect("/admin/operators?saved=1");
}

export async function updateAdminOperatorAction(formData: FormData) {
  await requireAdminSession();
  const operatorId = Number(formData.get("operatorId"));
  const parsed = vendorOperatorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    street: formData.get("street"),
    city: formData.get("city"),
  });
  if (!parsed.success) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid operator")}`);
  await updateOperatorForAdmin(operatorId, {
    name: parsed.data.name,
    phone: optionalString(formData.get("phone")),
    email: optionalString(formData.get("email")),
    street: optionalString(formData.get("street")),
    city: optionalString(formData.get("city")),
  });
  revalidatePath(`/admin/operators/${operatorId}`);
  redirect(`/admin/operators/${operatorId}?saved=operator`);
}

export async function createAdminRouteAction(formData: FormData) {
  await requireAdminSession();
  const operatorId = Number(formData.get("operatorId"));
  const parsed = vendorRouteSchema.safeParse({ code: formData.get("code"), longName: formData.get("longName") });
  if (!parsed.success) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid route")}`);
  const result = await createRouteForAdmin(operatorId, parsed.data);
  if (!result.ok) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/admin/operators/${operatorId}`);
  redirect(`/admin/operators/${operatorId}?saved=route`);
}

export async function deleteAdminRouteAction(formData: FormData) {
  await requireAdminSession();
  const operatorId = Number(formData.get("operatorId"));
  const routeId = Number(formData.get("routeId"));
  const result = await deleteRouteForAdmin(operatorId, routeId);
  if (!result.ok) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/admin/operators/${operatorId}`);
  redirect(`/admin/operators/${operatorId}?saved=route`);
}

export async function updateAdminRouteAction(formData: FormData) {
  await requireAdminSession();
  const operatorId = Number(formData.get("operatorId"));
  const routeId = Number(formData.get("routeId"));
  const parsed = vendorRouteSchema.safeParse({ code: formData.get("code"), longName: formData.get("longName") });
  if (!parsed.success) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid route")}`);
  const result = await updateRouteForAdmin(operatorId, routeId, parsed.data);
  if (!result.ok) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/admin/operators/${operatorId}`);
  redirect(`/admin/operators/${operatorId}?saved=route`);
}

export async function createAdminDepartureAction(formData: FormData) {
  await requireAdminSession();
  const operatorId = Number(formData.get("operatorId"));
  const parsed = vendorNewDepartureSchema.safeParse({
    routeId: formData.get("routeId"),
    fromStationId: formData.get("fromStationId"),
    toStationId: formData.get("toStationId"),
    departureTime: formData.get("departureTime"),
    arrivalTime: formData.get("arrivalTime"),
    durationMin: formData.get("durationMin"),
    distanceKm: formData.get("distanceKm"),
    basePrice: formData.get("basePrice"),
    plannedSeats: formData.get("plannedSeats"),
    weekdays: formData.getAll("weekdays"),
  });
  if (!parsed.success) {
    redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid departure")}`);
  }
  const result = await createDepartureForAdmin({
    ...parsed.data,
    weekdays: parsed.data.weekdays.sort((a, b) => a - b),
  });
  if (!result.ok) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/admin/operators/${operatorId}`);
  redirect(`/admin/operators/${operatorId}?saved=departure`);
}

export async function deleteAdminDepartureAction(formData: FormData) {
  await requireAdminSession();
  const operatorId = Number(formData.get("operatorId"));
  const tripDepartureId = Number(formData.get("tripDepartureId"));
  const result = await deleteDepartureForAdmin(tripDepartureId);
  if (!result.ok) redirect(`/admin/operators/${operatorId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/admin/operators/${operatorId}`);
  redirect(`/admin/operators/${operatorId}?saved=departure`);
}

export async function updateAdminDepartureAction(formData: FormData) {
  await requireAdminSession();
  const parsed = vendorDepartureSchema.safeParse({
    tripDepartureId: formData.get("tripDepartureId"),
    departureTime: formData.get("departureTime"),
    arrivalTime: formData.get("arrivalTime"),
    basePrice: formData.get("basePrice"),
    plannedSeats: formData.get("plannedSeats"),
    freeSeats: formData.get("freeSeats"),
    canBoard: formData.get("canBoard") ? "on" : undefined,
    weekdays: formData.getAll("weekdays"),
  });
  if (!parsed.success) redirect(`/admin/operators?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid departure")}`);
  const operatorId = await updateDepartureForAdmin({
    ...parsed.data,
    canBoard: Boolean(parsed.data.canBoard),
    weekdays: parsed.data.weekdays.sort((a, b) => a - b),
  });
  if (!operatorId) redirect("/admin/operators?error=Departure%20not%20found");
  revalidatePath(`/admin/operators/${operatorId}`);
  redirect(`/admin/operators/${operatorId}?saved=departure`);
}

export async function deleteAdminBookingAction(formData: FormData) {
  await requireAdminSession();
  const bookingReference = String(formData.get("bookingReference"));
  const result = await deleteBookingForAdmin(bookingReference);
  if (!result.ok) redirect(`/admin/bookings?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings?saved=1");
}

export async function deleteAdminPaymentAction(formData: FormData) {
  await requireAdminSession();
  const paymentId = Number(formData.get("paymentId"));
  await deletePaymentForAdmin(paymentId);
  revalidatePath("/admin/payments");
  redirect("/admin/payments?saved=1");
}

export async function resolveOperatorReportAction(formData: FormData) {
  await requireAdminSession();
  const reportId = Number(formData.get("reportId"));
  await resolveOperatorReportForAdmin(reportId);
  revalidatePath("/admin/reports");
  redirect("/admin/reports?saved=1");
}
