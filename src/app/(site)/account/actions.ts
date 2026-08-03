"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { userSignupSchema, userLoginSchema, userProfileSchema } from "@/lib/validation";
import { createUser, authenticateUser, updateUserProfile } from "@/db/queries/users";
import { cancelUserBooking } from "@/db/queries/bookings";
import { cancelUserTaxiRequest } from "@/db/queries/taxi";
import {
  setUserSession,
  clearUserSession,
  requireUserSession,
} from "@/lib/user-session";

function cleanOptional(value: FormDataEntryValue | null) {
  const str = typeof value === "string" ? value.trim() : "";
  return str ? str : null;
}

export async function signupUserAction(formData: FormData) {
  const parsed = userSignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    redirect(`/account/signup?error=${encodeURIComponent(message)}`);
  }

  const result = await createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    phone: cleanOptional(formData.get("phone")),
  });

  if (!result.ok) {
    redirect("/account/signup?error=An%20account%20with%20this%20email%20already%20exists");
  }

  await setUserSession(result.userId);
  redirect("/account");
}

export async function loginUserAction(formData: FormData) {
  const parsed = userLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    redirect(`/account/login?error=${encodeURIComponent(message)}`);
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) {
    redirect("/account/login?error=Invalid%20email%20or%20password");
  }

  await setUserSession(user.id);
  redirect("/account");
}

export async function logoutUserAction() {
  await clearUserSession();
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const userId = await requireUserSession();
  const parsed = userProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your details and try again.";
    redirect(`/account?error=${encodeURIComponent(message)}`);
  }

  await updateUserProfile(userId, {
    name: parsed.data.name,
    phone: cleanOptional(formData.get("phone")),
  });

  revalidatePath("/account");
  redirect("/account?saved=1");
}

export async function cancelBookingAction(formData: FormData) {
  const userId = await requireUserSession();
  const reference = String(formData.get("reference") ?? "");

  const cancelled = await cancelUserBooking(userId, reference);

  revalidatePath("/account");
  redirect(cancelled ? "/account?cancelled=1" : "/account?error=Booking%20could%20not%20be%20cancelled");
}

export async function cancelTaxiRequestAction(formData: FormData) {
  const userId = await requireUserSession();
  const cancelled = await cancelUserTaxiRequest(userId, Number(formData.get("requestId")));
  revalidatePath("/account");
  redirect(cancelled ? "/account?taxiCancelled=1" : "/account?error=Taxi%20request%20could%20not%20be%20cancelled");
}
