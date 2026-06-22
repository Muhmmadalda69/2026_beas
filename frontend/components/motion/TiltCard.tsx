"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";

/**
 * Tilts toward the pointer in 3D for a sense of depth. Only active on a fine
 * pointer (mouse) and when motion is allowed — on touch screens or with
 * reduced motion it renders a plain element with no listeners.
 */
export default function TiltCard({
  children,
  className = "",
  max = 9,
  scale = 1.02,
}: {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees on each axis. */
  max?: number;
  /** Hover scale. */
  scale?: number;
}) {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  // Decide on the client only — avoids SSR/hydration mismatch.
  useEffect(() => {
    const fine =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches;
    setEnabled(fine && !reduced);
  }, [reduced]);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springRx = useSpring(rx, { stiffness: 200, damping: 18 });
  const springRy = useSpring(ry, { stiffness: 200, damping: 18 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  };

  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{
        rotateX: springRx,
        rotateY: springRy,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
