"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * ShaderGlow — adapted from 21st.dev (aliimam/shader-animation).
 * A subtle, premium animated radial glow rendered on canvas.
 * Two slow-drifting teal/cyan blobs. Kept low-opacity and behind content.
 */
export default function ShaderGlow({
  className,
  intensity = 0.55,
}: {
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const blob = (x: number, y: number, r: number, c: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      const r = Math.min(w, h) * 0.55;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const drift = reduce ? 0 : 1;

      blob(
        cx + Math.cos(t * 0.6) * w * 0.12 * drift,
        cy + Math.sin(t * 0.5) * h * 0.10 * drift,
        r,
        `rgba(53,211,255,${0.12 * intensity})`
      );
      blob(
        cx + Math.cos(t * 0.4 + 2) * w * 0.14 * drift,
        cy + Math.sin(t * 0.7 + 1) * h * 0.12 * drift,
        r * 0.85,
        `rgba(0,194,168,${0.13 * intensity})`
      );

      ctx.globalCompositeOperation = "source-over";
      if (!reduce) {
        t += 0.005;
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduce, intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
