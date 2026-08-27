"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  vendorBookingEditSchema,
  vendorClaimSignupSchema,
  vendorDepartureSchema,
  vendorLoginSchema,
  vendorManualBookingSchema,
  vendorNewOperatorSignupSchema,
  vendorOperatorSchema,
  vendorRouteSchema,
  vendorRouteStopSchema,
  vendorRouteStopNewLocationSchema,
  vendorNewDepartureSchema,
  vendorTeamUserSchema,
} from "@/lib/validation";
import {
  applyAsNewOperator,
  applyForExistingOperator,
  authenticateVendor,
  cancelVendorBooking,
  createManualBookingForVendor,
  createVendorDeparture,
  createVendorRoute,
  createVendorRouteStop,
  createVendorRouteStopAtNewLocation,
  createVendorTeamUser,
  deleteVendorRouteStop,
  deleteVendorTeamUser,
  markVendorBookingPaid,
  updateVendorBookingDetails,
  updateVendorDeparture,
  updateVendorOperator,
  updateVendorRouteStop,
  updateVendorTeamUserPermissions,
} from "@/db/queries/vendors";
import { isVendorPermission } from "@/lib/vendor-permissions";
import {
  clearVendorSession,
  requireVendorSession,
  setVendorSession,
} from "@/lib/vendor-session";

function cleanOptional(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

export async function loginVendorAction(formData: FormData) {
  const parsed = vendorLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/vendor/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid login")}`);
  }

  const result = await authenticateVendor(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    const message =
      result.error === "pending_approval"
        ? "Your account is awaiting admin approval. You'll be able to sign in once it's approved."
        : result.error === "rejected"
          ? "This vendor application was not approved. Contact support for details."
          : "Invalid email or password.";
    redirect(`/vendor/login?error=${encodeURIComponent(message)}`);
  }

  await setVendorSession(result.id);
  redirect("/vendor");
}

export async function signupClaimOperatorAction(formData: FormData) {
  const parsed = vendorClaimSignupSchema.safeParse({
    operatorId: formData.get("operatorId"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/vendor/signup?mode=claim&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid details")}`);
  }

  const result = await applyForExistingOperator(parsed.data.operatorId, {
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (!result.ok) {
    redirect(`/vendor/signup?mode=claim&error=${encodeURIComponent(result.error)}`);
  }

  redirect("/vendor/login?pending=1");
}

export async function signupNewOperatorAction(formData: FormData) {
  const parsed = vendorNewOperatorSignupSchema.safeParse({
    operatorName: formData.get("operatorName"),
    vat: formData.get("vat"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    city: formData.get("city"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/vendor/signup?mode=new&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid details")}`);
  }

  const result = await applyAsNewOperator({
    operatorName: parsed.data.operatorName,
    vat: parsed.data.vat,
    phone: cleanOptional(parsed.data.phone),
    street: cleanOptional(parsed.data.street),
    city: cleanOptional(parsed.data.city),
    contactName: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (!result.ok) {
    redirect(`/vendor/signup?mode=new&error=${encodeURIComponent(result.error)}`);
  }

  redirect("/vendor/login?pending=1");
}

export async function logoutVendorAction() {
  await clearVendorSession();
  redirect("/vendor/login");
}

export async function updateVendorOperatorAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const parsed = vendorOperatorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    street: formData.get("street"),
    city: formData.get("city"),
  });

  if (!parsed.success) {
    redirect(`/vendor/profile?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid operator details")}`);
  }

  await updateVendorOperator(vendorUserId, {
    name: parsed.data.name,
    phone: cleanOptional(parsed.data.phone),
    email: cleanOptional(parsed.data.email),
    street: cleanOptional(parsed.data.street),
    city: cleanOptional(parsed.data.city),
  });

  revalidatePath("/vendor/profile");
  redirect("/vendor/profile?saved=1");
}

export async function updateVendorDepartureAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
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

  if (!parsed.success) {
    redirect(`/vendor/departures?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid departure")}`);
  }

  const updated = await updateVendorDeparture(vendorUserId, {
    ...parsed.data,
    canBoard: Boolean(parsed.data.canBoard),
    weekdays: parsed.data.weekdays.sort((a, b) => a - b),
  });

  if (!updated) {
    redirect("/vendor/departures?error=Departure%20not%20found");
  }

  revalidatePath("/vendor/departures");
  redirect("/vendor/departures?saved=1");
}

export async function createVendorRouteAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const parsed = vendorRouteSchema.safeParse({ code: formData.get("code"), longName: formData.get("longName") });
  if (!parsed.success) redirect(`/vendor/routes?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid route")}`);
  try {
    await createVendorRoute(vendorUserId, parsed.data);
  } catch {
    redirect("/vendor/routes?error=That%20route%20code%20is%20already%20in%20use");
  }
  revalidatePath("/vendor/routes");
  redirect("/vendor/routes?saved=1");
}

export async function createVendorDepartureAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
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
  if (!parsed.success) redirect(`/vendor/departures?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid departure")}`);
  let created = false;
  try {
    created = await createVendorDeparture(vendorUserId, {
      ...parsed.data,
      weekdays: parsed.data.weekdays.sort((a, b) => a - b),
    });
  } catch {
    redirect("/vendor/departures?error=A%20departure%20with%20these%20details%20already%20exists");
  }
  if (!created) redirect("/vendor/departures?error=Route%20not%20found");
  revalidatePath("/vendor/departures");
  redirect("/vendor/departures?saved=1");
}

export async function createVendorRouteStopAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const routeId = Number(formData.get("routeId"));
  const parsed = vendorRouteStopSchema.safeParse({
    routeId: formData.get("routeId"),
    stationId: formData.get("stationId"),
    sequenceOrder: formData.get("sequenceOrder"),
    minutesFromDeparture: formData.get("minutesFromDeparture"),
    priceToDestination: formData.get("priceToDestination") || undefined,
  });
  if (!parsed.success) {
    redirect(`/vendor/routes/${routeId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid stop")}`);
  }
  const result = await createVendorRouteStop(vendorUserId, parsed.data);
  if (!result.ok) redirect(`/vendor/routes/${routeId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/vendor/routes/${routeId}`);
  redirect(`/vendor/routes/${routeId}?saved=1`);
}

export async function createVendorRouteStopAtNewLocationAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const routeId = Number(formData.get("routeId"));
  const parsed = vendorRouteStopNewLocationSchema.safeParse({
    routeId: formData.get("routeId"),
    stationName: formData.get("stationName"),
    city: formData.get("city"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    sequenceOrder: formData.get("sequenceOrder"),
    minutesFromDeparture: formData.get("minutesFromDeparture"),
    priceToDestination: formData.get("priceToDestination") || undefined,
  });
  if (!parsed.success) {
    redirect(`/vendor/routes/${routeId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid stop")}`);
  }
  const result = await createVendorRouteStopAtNewLocation(vendorUserId, parsed.data);
  if (!result.ok) redirect(`/vendor/routes/${routeId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/vendor/routes/${routeId}`);
  redirect(`/vendor/routes/${routeId}?saved=1`);
}

export async function updateVendorRouteStopAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const routeId = Number(formData.get("routeId"));
  const routeStopId = Number(formData.get("routeStopId"));
  const parsed = vendorRouteStopSchema
    .pick({ sequenceOrder: true, minutesFromDeparture: true, priceToDestination: true })
    .safeParse({
      sequenceOrder: formData.get("sequenceOrder"),
      minutesFromDeparture: formData.get("minutesFromDeparture"),
      priceToDestination: formData.get("priceToDestination") || undefined,
    });
  if (!parsed.success) {
    redirect(`/vendor/routes/${routeId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid stop")}`);
  }
  const result = await updateVendorRouteStop(vendorUserId, routeStopId, parsed.data);
  if (!result.ok) redirect(`/vendor/routes/${routeId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/vendor/routes/${routeId}`);
  redirect(`/vendor/routes/${routeId}?saved=1`);
}

export async function deleteVendorRouteStopAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const routeId = Number(formData.get("routeId"));
  const routeStopId = Number(formData.get("routeStopId"));
  const result = await deleteVendorRouteStop(vendorUserId, routeStopId);
  if (!result.ok) redirect(`/vendor/routes/${routeId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(`/vendor/routes/${routeId}`);
  redirect(`/vendor/routes/${routeId}?saved=1`);
}

export async function createManualBookingAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const touchScreenMode = formData.get("channel") === "touch_screen";
  const parsed = vendorManualBookingSchema.safeParse({
    tripDepartureId: formData.get("tripDepartureId"),
    travelDate: formData.get("travelDate"),
    passengerName: formData.get("passengerName"),
    passengerPhone: formData.get("passengerPhone"),
    passengerEmail: formData.get("passengerEmail") || undefined,
    seats: formData.get("seats"),
    routeStopId: formData.get("routeStopId") || undefined,
    channel: formData.get("channel") || undefined,
    paid: formData.get("paid") ? "true" : "false",
    amountOverride: formData.get("amountOverride") || undefined,
  });
  if (!parsed.success) {
    const mode = touchScreenMode ? "&mode=touch_screen" : "";
    redirect(`/vendor/bookings/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid booking")}${mode}`);
  }

  const result = await createManualBookingForVendor(vendorUserId, {
    tripDepartureId: parsed.data.tripDepartureId,
    travelDate: parsed.data.travelDate,
    passengerName: parsed.data.passengerName,
    passengerPhone: parsed.data.passengerPhone,
    passengerEmail: parsed.data.passengerEmail ? parsed.data.passengerEmail : null,
    seats: parsed.data.seats,
    routeStopId: parsed.data.routeStopId,
    channel: parsed.data.channel,
    paid: parsed.data.paid,
    amountOverride: parsed.data.amountOverride,
  });

  if (!result.ok) {
    const mode = touchScreenMode ? "&mode=touch_screen" : "";
    redirect(`/vendor/bookings/new?error=${encodeURIComponent(result.error)}${mode}`);
  }

  revalidatePath("/vendor/bookings");
  if (parsed.data.channel === "walk_in" || parsed.data.channel === "touch_screen") {
    redirect(`/booking/${result.reference}`);
  }
  redirect(`/vendor/bookings?saved=${result.reference}`);
}

export async function updateVendorBookingAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const bookingId = Number(formData.get("bookingId"));
  const parsed = vendorBookingEditSchema.safeParse({
    passengerName: formData.get("passengerName"),
    passengerPhone: formData.get("passengerPhone"),
    passengerEmail: formData.get("passengerEmail") || undefined,
    channel: formData.get("channel"),
  });
  if (!parsed.success) {
    redirect(`/vendor/bookings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid booking")}`);
  }
  const result = await updateVendorBookingDetails(vendorUserId, bookingId, {
    passengerName: parsed.data.passengerName,
    passengerPhone: parsed.data.passengerPhone,
    passengerEmail: parsed.data.passengerEmail ? parsed.data.passengerEmail : null,
    channel: parsed.data.channel,
  });
  if (!result.ok) redirect(`/vendor/bookings?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/vendor/bookings");
  redirect("/vendor/bookings?saved=1");
}

export async function cancelVendorBookingAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const bookingId = Number(formData.get("bookingId"));
  const result = await cancelVendorBooking(vendorUserId, bookingId);
  if (!result.ok) redirect(`/vendor/bookings?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/vendor/bookings");
  redirect("/vendor/bookings?saved=1");
}

export async function markVendorBookingPaidAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const bookingId = Number(formData.get("bookingId"));
  const result = await markVendorBookingPaid(vendorUserId, bookingId);
  if (!result.ok) redirect(`/vendor/bookings?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/vendor/bookings");
  redirect("/vendor/bookings?saved=1");
}

export async function createVendorTeamUserAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const parsed = vendorTeamUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) {
    redirect(`/vendor/users?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid details")}`);
  }
  const result = await createVendorTeamUser(vendorUserId, parsed.data);
  if (!result.ok) redirect(`/vendor/users?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/vendor/users");
  redirect("/vendor/users?saved=1");
}

export async function updateVendorTeamUserPermissionsAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const targetUserId = Number(formData.get("targetUserId"));
  const permissions = formData.getAll("permissions").map(String).filter(isVendorPermission);
  const result = await updateVendorTeamUserPermissions(vendorUserId, targetUserId, permissions);
  if (!result.ok) redirect(`/vendor/users?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/vendor/users");
  redirect("/vendor/users?saved=1");
}

export async function deleteVendorTeamUserAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const targetUserId = Number(formData.get("targetUserId"));
  const result = await deleteVendorTeamUser(vendorUserId, targetUserId);
  if (!result.ok) redirect(`/vendor/users?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/vendor/users");
  redirect("/vendor/users?saved=1");
}
