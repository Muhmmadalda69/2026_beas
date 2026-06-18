import { NextRequest, NextResponse } from "next/server";
import { serverApi, ApiError } from "@/lib/api";
import { TOKEN_COOKIE } from "@/lib/auth";
import type { AdminUser } from "@/lib/types";

interface LoginResult {
  token: string;
  expires_at: string;
  admin: AdminUser;
}

// Proxies the login to the auth service and, on success, stores the JWT in an
// httpOnly, SameSite=Lax cookie. The token never reaches client JavaScript.
export async function POST(req: NextRequest) {
  let payload: { username?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const result = await serverApi<LoginResult>("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = NextResponse.json({ admin: result.admin });
    const expires = new Date(result.expires_at);
    res.cookies.set(TOKEN_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    });
    return res;
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "login failed";
    return NextResponse.json({ error: message }, { status });
  }
}
