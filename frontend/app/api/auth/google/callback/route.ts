import { NextRequest, NextResponse } from "next/server";
import { internalApiBase } from "@/lib/api";
import { USER_TOKEN_COOKIE } from "@/lib/user";
import type { UserAuthResult } from "@/lib/userAuth";

// Handles Google's redirect: validates state, exchanges the code for tokens,
// extracts the verified identity, upserts the user via the trusted internal
// endpoint, and establishes the player session cookie.
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  // Build the public origin from the request Host header. In Next standalone
  // mode the server binds to 0.0.0.0, so url.origin can wrongly become
  // http://0.0.0.0:3000 — which the browser cannot open. The Host header
  // carries the real address the user typed (e.g. localhost:3000).
  const origin = publicOrigin(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get("g_state")?.value;
  const next = req.cookies.get("g_next")?.value || "/kuis";

  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/masuk?error=${encodeURIComponent(msg)}`, origin),
    );

  if (!code || !state || !savedState || state !== savedState) {
    return fail("Sesi Google tidak valid, coba lagi.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  if (!clientId || !clientSecret) return fail("Google login tidak aktif.");

  // Exchange the authorization code for tokens.
  let idToken: string;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    if (!tokenRes.ok || !tokenJson.id_token) return fail("Gagal menukar kode Google.");
    idToken = tokenJson.id_token;
  } catch {
    return fail("Tidak dapat menghubungi Google.");
  }

  // The id_token comes directly from Google over TLS, so decoding its payload
  // (sub/email/name) is trustworthy for our purposes.
  const claims = decodeJwtPayload(idToken);
  if (!claims?.sub || !claims.email) return fail("Profil Google tidak lengkap.");

  // Upsert the user through the trusted server-to-server endpoint.
  let result: UserAuthResult;
  try {
    const res = await fetch(`${internalApiBase()}/api/auth/users/oauth`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
      },
      body: JSON.stringify({
        provider: "google",
        sub: claims.sub,
        email: claims.email,
        name: claims.name || "",
      }),
    });
    const body = (await res.json()) as { data?: UserAuthResult; error?: string };
    if (!res.ok || !body.data) return fail(body.error || "Gagal masuk dengan Google.");
    result = body.data;
  } catch {
    return fail("Tidak dapat menyelesaikan login.");
  }

  const redirect = NextResponse.redirect(new URL(next, origin));
  redirect.cookies.set(USER_TOKEN_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(result.expires_at),
  });
  redirect.cookies.set("g_state", "", { path: "/", maxAge: 0 });
  redirect.cookies.set("g_next", "", { path: "/", maxAge: 0 });
  return redirect;
}

// publicOrigin returns the browser-facing origin from request headers, avoiding
// the 0.0.0.0 binding address that Next standalone reports via url.origin.
function publicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}

interface GoogleClaims {
  sub?: string;
  email?: string;
  name?: string;
}

function decodeJwtPayload(token: string): GoogleClaims | null {
  try {
    const part = token.split(".")[1];
    const json = Buffer.from(
      part.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(json) as GoogleClaims;
  } catch {
    return null;
  }
}
