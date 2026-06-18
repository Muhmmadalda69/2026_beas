"use client";

import { useEffect, useRef, useState } from "react";

const REDOC_SRC = "https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js";

type RedocGlobal = {
  init: (url: string, opts: object, el: HTMLElement) => void;
};

// Loads the Redoc standalone script once and resolves when ready.
function loadRedoc(): Promise<RedocGlobal> {
  const w = window as unknown as { Redoc?: RedocGlobal };
  if (w.Redoc) return Promise.resolve(w.Redoc);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${REDOC_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => w.Redoc && resolve(w.Redoc));
      existing.addEventListener("error", reject);
      if (w.Redoc) resolve(w.Redoc);
      return;
    }
    const script = document.createElement("script");
    script.src = REDOC_SRC;
    script.async = true;
    script.onload = () => (w.Redoc ? resolve(w.Redoc) : reject(new Error("no Redoc")));
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Renders the API reference with Redoc, loading the spec from the
// superadmin-gated /api/docs/spec route (cookie sent automatically).
//
// Redoc mutates the DOM directly, so it is mounted into a div created
// imperatively (NOT a JSX child). React therefore never reconciles Redoc's
// internal nodes, which avoids the "removeChild is not a child" crash on
// unmount / Strict Mode re-runs.
export default function RedocViewer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const mount = document.createElement("div");
    host.appendChild(mount);
    let cancelled = false;

    loadRedoc()
      .then((redoc) => {
        if (cancelled) return;
        redoc.init(
          "/api/docs/spec",
          { theme: { colors: { primary: { main: "#9a4a2a" } } } },
          mount,
        );
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      // Remove the imperatively-created subtree ourselves so React's later
      // unmount of `host` sees a node it can cleanly detach.
      try {
        mount.remove();
      } catch {
        /* already detached */
      }
    };
  }, []);

  if (failed) {
    return (
      <p className="text-muted">
        Tidak dapat memuat penampil Redoc (kemungkinan offline). Spesifikasi
        tetap tersedia bagi superadmin di{" "}
        <a href="/api/docs/spec" className="text-primary underline">
          /api/docs/spec
        </a>
        .
      </p>
    );
  }

  return <div ref={hostRef} className="rounded-xl border border-border bg-surface" />;
}
