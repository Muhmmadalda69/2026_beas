// API helpers. There are two flavours:
//
//   serverApi  — runs in Server Components / route handlers, calls the gateway
//                directly over the internal docker network.
//   clientGw   — runs in the browser, calls the same-origin Next proxy
//                (/api/gw/*) which injects the admin token from the httpOnly
//                cookie. This keeps the JWT out of client-readable storage and
//                sidesteps CORS entirely.

/** Base URL of the gateway as seen from the Next.js server process. */
export function internalApiBase(): string {
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
  );
}

interface Envelope<T> {
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Server-side fetch against the gateway. `path` starts with `/api/...`. */
export async function serverApi<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(`${internalApiBase()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  return unwrap<T>(res);
}

/** Browser-side fetch through the admin proxy (injects admin token). */
export async function clientGw<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api/gw/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  return unwrap<T>(res);
}

/** Browser-side fetch through the user proxy (injects player token if present). */
export async function userGw<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api/me/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  return unwrap<T>(res);
}

async function unwrap<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    throw new ApiError(body?.error || `Request failed (${res.status})`, res.status);
  }
  return (body?.data ?? (undefined as T)) as T;
}
