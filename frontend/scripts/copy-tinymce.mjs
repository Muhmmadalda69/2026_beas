// Copies the self-hosted TinyMCE assets from node_modules into public/tinymce
// so the editor loads entirely from our own origin (no CDN, no API key).
// Runs on postinstall and before build; safe to run repeatedly.
import { cp, rm, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "tinymce");
const dest = join(root, "public", "tinymce");

try {
  await access(src);
} catch {
  console.warn("[copy-tinymce] node_modules/tinymce not found; skipping.");
  process.exit(0);
}

await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });
console.log("[copy-tinymce] TinyMCE assets copied to public/tinymce");
