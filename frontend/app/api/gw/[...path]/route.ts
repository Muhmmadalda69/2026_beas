import { makeProxy } from "@/lib/proxy";
import { TOKEN_COOKIE } from "@/lib/auth";

// Admin proxy: injects the admin JWT (ga_token) for the admin panel.
export const { GET, POST, PUT, DELETE } = makeProxy(TOKEN_COOKIE);
