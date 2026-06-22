"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";

/**
 * Translates its children vertically as the element scrolls through the
 * viewport, creating depth between layers. Disabled (plain render) under
 * reduced motion. Hooks are always called so hook order stays stable.
 */
export default function Parallax({
  children,
  className = "",
  distance = 60,
}: {
  children: ReactNode;
  className?: string;
  /** Total travel in px across the scroll range (sign sets direction). */
  distance?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <motion.div
      ref={ref}
      style={reduced ? undefined : { y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
