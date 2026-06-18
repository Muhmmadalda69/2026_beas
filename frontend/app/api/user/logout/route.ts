import { NextResponse } from "next/server";
import { USER_TOKEN_COOKIE } from "@/lib/user";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
