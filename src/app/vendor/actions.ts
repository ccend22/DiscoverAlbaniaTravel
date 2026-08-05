"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  vendorClaimSignupSchema,
  vendorDepartureSchema,
  vendorLoginSchema,
  vendorNewOperatorSignupSchema,
  vendorOperatorSchema,
  vendorRouteSchema,
  vendorNewDepartureSchema,
} from "@/lib/validation";
import {
  applyAsNewOperator,
  applyForExistingOperator,
  authenticateVendor,
  createVendorDeparture,
  createVendorRoute,
  updateVendorDeparture,
  updateVendorOperator,
} from "@/db/queries/vendors";
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
    redirect(`/vendor?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid operator details")}`);
  }

  await updateVendorOperator(vendorUserId, {
    name: parsed.data.name,
    phone: cleanOptional(parsed.data.phone),
    email: cleanOptional(parsed.data.email),
    street: cleanOptional(parsed.data.street),
    city: cleanOptional(parsed.data.city),
  });

  revalidatePath("/vendor");
  redirect("/vendor?saved=operator");
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
    redirect(`/vendor?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid departure")}`);
  }

  const updated = await updateVendorDeparture(vendorUserId, {
    ...parsed.data,
    canBoard: Boolean(parsed.data.canBoard),
    weekdays: parsed.data.weekdays.sort((a, b) => a - b),
  });

  if (!updated) {
    redirect("/vendor?error=Departure%20not%20found");
  }

  revalidatePath("/vendor");
  redirect("/vendor?saved=departure");
}

export async function createVendorRouteAction(formData: FormData) {
  const vendorUserId = await requireVendorSession();
  const parsed = vendorRouteSchema.safeParse({ code: formData.get("code"), longName: formData.get("longName") });
  if (!parsed.success) redirect(`/vendor?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid route")}`);
  try {
    await createVendorRoute(vendorUserId, parsed.data);
  } catch {
    redirect("/vendor?error=That%20route%20code%20is%20already%20in%20use");
  }
  revalidatePath("/vendor");
  redirect("/vendor?saved=route");
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
  if (!parsed.success) redirect(`/vendor?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid departure")}`);
  let created = false;
  try {
    created = await createVendorDeparture(vendorUserId, {
      ...parsed.data,
      weekdays: parsed.data.weekdays.sort((a, b) => a - b),
    });
  } catch {
    redirect("/vendor?error=A%20departure%20with%20these%20details%20already%20exists");
  }
  if (!created) redirect("/vendor?error=Route%20not%20found");
  revalidatePath("/vendor");
  redirect("/vendor?saved=departure");
}
