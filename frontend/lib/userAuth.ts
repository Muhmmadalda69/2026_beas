import { NextResponse } from "next/server";
import { USER_TOKEN_COOKIE } from "./user";
import { cookieSecure } from "./cookies";

interface UserAuthResult {
  token: string;
  expires_at: string;
  user: { id: string; name: string; email: string; role: string };
}

/** Builds a JSON response that also sets the player session cookie. */
export function withUserCookie(result: UserAuthResult): NextResponse {
  const res = NextResponse.json({ user: result.user });
  res.cookies.set(USER_TOKEN_COOKIE, result.token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    expires: new Date(result.expires_at),
  });
  return res;
}

export type { UserAuthResult };
