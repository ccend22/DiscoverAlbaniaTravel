import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCodeForAccessToken,
  fetchGoogleUserInfo,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_PKCE_COOKIE,
} from "@/lib/google-oauth";
import { findOrCreateGoogleUser } from "@/db/queries/users";
import { setUserSession } from "@/lib/user-session";

function statesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function GET(request: NextRequest) {
  const loginErrorUrl = (message: string) =>
    new URL(`/account/login?error=${encodeURIComponent(message)}`, request.url);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(GOOGLE_OAUTH_PKCE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);
  cookieStore.delete(GOOGLE_OAUTH_PKCE_COOKIE);

  if (oauthError) {
    return NextResponse.redirect(loginErrorUrl("Google sign-in was cancelled"));
  }

  if (!code || !state || !expectedState || !codeVerifier || !statesMatch(state, expectedState)) {
    console.error("[google-oauth] state check failed", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasExpectedState: Boolean(expectedState),
      hasCodeVerifier: Boolean(codeVerifier),
      statesEqual: state && expectedState ? state === expectedState : null,
    });
    return NextResponse.redirect(loginErrorUrl("Google sign-in failed, please try again"));
  }

  try {
    const accessToken = await exchangeCodeForAccessToken(code, codeVerifier);
    const profile = await fetchGoogleUserInfo(accessToken);

    if (!profile.email || !profile.email_verified) {
      return NextResponse.redirect(loginErrorUrl("Your Google account has no verified email"));
    }

    const result = await findOrCreateGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name || profile.email,
    });

    if (!result.ok) {
      const message =
        result.error === "email_registered"
          ? "An account with this email already exists. Sign in with your password instead."
          : "This account is not active";
      return NextResponse.redirect(loginErrorUrl(message));
    }

    await setUserSession(result.userId);
    return NextResponse.redirect(new URL("/account", request.url));
  } catch (error) {
    console.error("[google-oauth] callback failed", error);
    return NextResponse.redirect(loginErrorUrl("Google sign-in failed, please try again"));
  }
}
