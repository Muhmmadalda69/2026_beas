import { NextRequest, NextResponse } from "next/server";
import { cookieSecure } from "@/lib/cookies";

// Starts the Google OAuth flow: sets a CSRF state cookie and redirects to
// Google's consent screen. Disabled (404) when credentials are not configured.
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${req.nextUrl.origin}/api/auth/google/callback`;
  if (!clientId) {
    return NextResponse.json({ error: "google login disabled" }, { status: 404 });
  }

  const state = globalThis.crypto.randomUUID();
  const next = req.nextUrl.searchParams.get("next") || "/kuis";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl.toString());
  const cookieOpts = {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("g_state", state, cookieOpts);
  res.cookies.set("g_next", next, cookieOpts);
  return res;
}
