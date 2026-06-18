// Whether session cookies should carry the `Secure` attribute. Secure cookies
// are NOT sent over plain HTTP, so a deployment served on http:// (e.g. port 80
// without TLS) must keep this false or logins silently fail. Set
// COOKIE_SECURE=true only when the site is served over HTTPS.
export function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE === "true";
}
