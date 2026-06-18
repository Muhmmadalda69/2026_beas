import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/auth";

// Guards the admin area (Next.js 16 "proxy" convention, formerly middleware).
// Requests to /admin/* without a session cookie are redirected to login. Token
// validity is re-verified server-side in the admin layout; this is the fast
// first gate.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasToken = req.cookies.get(TOKEN_COOKIE)?.value;
    if (!hasToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
