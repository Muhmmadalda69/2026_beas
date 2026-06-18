import { cookies } from "next/headers";
import { serverApi } from "./api";

/** httpOnly cookie holding the end-user (quiz player) JWT. */
export const USER_TOKEN_COOKIE = "ga_user";

export interface SessionUser {
  id: string;
  name: string;
  role: string;
}

/** Reads the player token from cookies (server-side only). */
export async function getUserToken(): Promise<string | undefined> {
  return (await cookies()).get(USER_TOKEN_COOKIE)?.value;
}

/** Returns the logged-in player, or null. Validates the token with the backend. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getUserToken();
  if (!token) return null;
  try {
    return await serverApi<SessionUser>("/api/auth/users/me", { token });
  } catch {
    return null;
  }
}

/** Whether Google login is configured (server-side env present). */
export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
