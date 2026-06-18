import { NextRequest, NextResponse } from "next/server";
import { serverApi, ApiError } from "@/lib/api";
import { withUserCookie, type UserAuthResult } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  try {
    const result = await serverApi<UserAuthResult>("/api/auth/users/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return withUserCookie(result);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "login gagal";
    return NextResponse.json({ error: message }, { status });
  }
}
