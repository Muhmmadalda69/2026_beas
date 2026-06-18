import { cookies } from "next/headers";
import { serverApi } from "./api";
import type { AdminUser } from "./types";

/** Name of the httpOnly cookie holding the admin JWT. */
export const TOKEN_COOKIE = "ga_token";

/** Reads the admin token from the request cookies (server-side only). */
export async function getToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value;
}

/**
 * Returns the authenticated admin by validating the cookie token against the
 * auth service, or null if unauthenticated/expired.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    return await serverApi<AdminUser>("/api/auth/me", { token });
  } catch {
    return null;
  }
}
