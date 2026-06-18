import { makeProxy } from "@/lib/proxy";
import { USER_TOKEN_COOKIE } from "@/lib/user";

// User proxy: injects the player JWT (ga_user) when present. Used by the quiz
// player and other end-user calls; anonymous requests pass through tokenless.
export const { GET, POST, PUT, DELETE } = makeProxy(USER_TOKEN_COOKIE);
