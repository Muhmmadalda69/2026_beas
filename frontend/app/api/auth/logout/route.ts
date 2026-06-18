import { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/auth";

// Clears the admin session cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
