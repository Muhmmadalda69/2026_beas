import type { CSSProperties, ReactNode } from "react";

/**
 * Wraps decorative content in a gentle idle float (pure CSS — the
 * reduced-motion rule in globals.css turns it off automatically). `delay`
 * desynchronises multiple floats so they don't bob in lockstep.
 */
export default function FloatLayer({
  children,
  className = "",
  slow = false,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  slow?: boolean;
  delay?: number;
}) {
  const style: CSSProperties | undefined =
    delay > 0 ? { animationDelay: `${delay}s` } : undefined;
  return (
    <div
      className={`${slow ? "animate-float-slow" : "animate-float"} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
