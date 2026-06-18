import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { internalApiBase } from "@/lib/api";

// Builds a same-origin reverse-proxy handler set that injects the JWT from the
// given httpOnly cookie as a Bearer token. Two instances are used:
//   - admin proxy (ga_token) for the admin panel
//   - user proxy  (ga_user) for quiz play/submit and other player calls
// Restricting the proxied prefixes prevents this from becoming an open proxy.

const ALLOWED = new Set(["auth", "wiki", "quiz", "translit"]);

export function makeProxy(cookieName: string) {
  async function handle(req: NextRequest, path: string[]): Promise<NextResponse> {
    if (path.length === 0 || !ALLOWED.has(path[0])) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const target = `${internalApiBase()}/api/${path.join("/")}${req.nextUrl.search}`;
    const headers = new Headers();
    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    const token = (await cookies()).get(cookieName)?.value;
    if (token) headers.set("authorization", `Bearer ${token}`);

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const body = hasBody ? await req.text() : undefined;

    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method: req.method,
        headers,
        body,
        cache: "no-store",
      });
    } catch {
      return NextResponse.json({ error: "upstream unavailable" }, { status: 502 });
    }

    const respBody = await upstream.text();
    return new NextResponse(respBody || null, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  }

  type Ctx = { params: Promise<{ path: string[] }> };
  const make = (req: NextRequest, { params }: Ctx) =>
    params.then((p) => handle(req, p.path));

  return { GET: make, POST: make, PUT: make, DELETE: make };
}
