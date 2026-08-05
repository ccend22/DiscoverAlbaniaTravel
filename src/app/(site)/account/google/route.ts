import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildGoogleAuthUrl,
  generatePkcePair,
  GoogleOAuthConfigError,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_PKCE_COOKIE,
} from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  try {
    const state = randomBytes(16).toString("hex");
    const { verifier, challenge } = generatePkcePair();
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    };
    cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOptions);
    cookieStore.set(GOOGLE_OAUTH_PKCE_COOKIE, verifier, cookieOptions);

    return NextResponse.redirect(buildGoogleAuthUrl(state, challenge));
  } catch (error) {
    if (error instanceof GoogleOAuthConfigError) {
      return NextResponse.redirect(new URL("/account/login?error=Google%20sign-in%20is%20not%20configured", request.url));
    }
    throw error;
  }
}
