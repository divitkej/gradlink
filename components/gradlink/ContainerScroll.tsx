"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * ContainerScroll — scroll-driven 3D reveal of a product card (adapted from the
 * Aceternity pattern). As the section scrolls through view the card rotates up
 * from a tilt and settles flat, like a command-center screen rising into focus.
 * Transparent (shares the global GradLinkBackground). Reduced-motion → static.
 */
export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const rotate = useTransform(scrollYProgress, [0.05, 0.4], [22, 0]);
  const scale = useTransform(scrollYProgress, [0.05, 0.4], [1.04, 1]);
  const titleY = useTransform(scrollYProgress, [0.05, 0.4], [40, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0.05, 0.3], [0, 1]);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        padding: "40px 20px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <motion.div
        style={{
          maxWidth: 900,
          textAlign: "center",
          marginBottom: 28,
          ...(reduce ? {} : { y: titleY, opacity: titleOpacity }),
        }}
      >
        {titleComponent}
      </motion.div>

      <div style={{ perspective: 1000, width: "100%", maxWidth: 1100 }}>
        <motion.div
          style={{
            rotateX: reduce ? 0 : rotate,
            scale: reduce ? 1 : scale,
            transformStyle: "preserve-3d",
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--border-strong)",
            background: "linear-gradient(160deg, rgba(16,42,69,0.82), rgba(11,30,51,0.72))",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow:
              "0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(53,211,255,0.12), 0 0 80px rgba(0,194,168,0.16)",
            padding: "clamp(16px, 2.4vw, 28px)",
          }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
