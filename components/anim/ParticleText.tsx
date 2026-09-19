"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * ParticleText — adapted from 21st.dev (Kain0127/particle-text-effect).
 * Renders text as particles that converge into place when in view.
 * Kept readable and elegant: particles settle quickly, then hold.
 */
export default function ParticleText({
  text,
  fontSize = 72,
  color = "#35D3FF",
  height = 120,
  lerp = 0.08,
  frames = 160,
  weight = 700,
}: {
  text: string;
  fontSize?: number;
  color?: string;
  height?: number;
  /** Easing factor per frame — smaller = slower, gentler convergence. */
  lerp?: number;
  /** How many frames to run before snapping to the settled word. */
  frames?: number;
  /** Font weight (match the solid text it morphs into). */
  weight?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let waitRaf = 0;
    let attempts = 0;

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.floor(canvas.getBoundingClientRect().width);
      const H = Math.floor(height);

      // Canvas not laid out yet — wait for a real width before sampling.
      // (getImageData throws IndexSizeError on a zero-size source.)
      if (W < 1 || H < 1) {
        if (attempts++ < 60) waitRaf = requestAnimationFrame(setup);
        return;
      }

      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      // Sample text into target points
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.fillStyle = "#fff";
      octx.font = `${weight} ${fontSize}px 'Space Grotesk', system-ui, sans-serif`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText(text, W / 2, H / 2);

      const data = octx.getImageData(0, 0, W, H).data;
      const targets: { x: number; y: number }[] = [];
      const gap = 4;
      for (let y = 0; y < H; y += gap) {
        for (let x = 0; x < W; x += gap) {
          const idx = (y * W + x) * 4;
          if (data[idx + 3] > 128) targets.push({ x, y });
        }
      }

      type P = { x: number; y: number; tx: number; ty: number };
      const particles: P[] = targets.map((tp) => ({
        x: reduce ? tp.x : Math.random() * W,
        y: reduce ? tp.y : Math.random() * H,
        tx: tp.x,
        ty: tp.y,
      }));

      let frame = 0;
      const render = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = color;
        for (const p of particles) {
          p.x += (p.tx - p.x) * lerp;
          p.y += (p.ty - p.y) * lerp;
          ctx.fillRect(p.x, p.y, 1.6, 1.6);
        }
        frame++;
        if (!reduce && frame < frames) raf = requestAnimationFrame(render);
        else {
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = color;
          for (const p of particles) ctx.fillRect(p.tx, p.ty, 1.6, 1.6);
        }
      };
      render();
    };

    setup();
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(waitRaf);
    };
  }, [text, fontSize, color, height, reduce, lerp, frames, weight]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={text}
      style={{ width: "100%", height, display: "block" }}
    />
  );
}
