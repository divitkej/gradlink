"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import Logo from "../Logo";

// Every link goes to a page or home-page section that exists today.
// Planned links that have no destination yet are tracked in
// docs/checklists/features-to-build.md instead of shipping as dead links.
const columns: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "How it works", href: "/#journey" },
    { label: "Platform", href: "/#product" },
    { label: "Live events", href: "/#live" },
    { label: "Pricing", href: "/pricing" },
  ],
  Students: [
    { label: "Career readiness", href: "/#readiness" },
    { label: "Create a student account", href: "/sign-up/student" },
  ],
  Employers: [
    { label: "Employer tools", href: "/#employers" },
    { label: "Create a company account", href: "/sign-up/company" },
  ],
  Colleges: [
    { label: "Outcome analytics", href: "/#analytics" },
    { label: "Create a college account", href: "/sign-up/college" },
    { label: "Sign in", href: "/sign-in" },
  ],
};

const WORD = "gradleap";
const INK = "#F5F5F5";
// Share of the g and p tails left showing; the rest runs off the page edge.
// Cropping higher, into the letters, made g and p read as a and n on phones.
const TAIL = 0.5;

/*
 * The wordmark is printed as halftone dots on a canvas, set to fill the full
 * width and cut off by the bottom edge through the g and p tails. Each dot is sized by how much of the
 * letter covers its cell, so the type keeps its edges at any width. The first
 * time it scrolls into view the dots grow in from left to right, then it holds
 * still: no cursor or click response. The canvas is transparent, so the site
 * background shows through.
 */
function HalftoneWordmark() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = wrap.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!box || !cv || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // x, y, radius per dot
    let dots = new Float32Array(0);
    let w = 0;
    let h = 0;
    let dpr = 1;
    let start = -1; // reveal start time, -1 until first seen
    let raf = 0;
    const REVEAL = 1.1; // seconds for the sweep to cross the word
    const GROW = 0.45; // seconds for one dot to reach full size

    const layout = () => {
      w = Math.max(1, Math.round(box.getBoundingClientRect().width));
      const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "system-ui, sans-serif";
      const m = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!m) return;
      m.font = `700 100px ${family}`;
      const size = (w * 0.98) / (m.measureText(WORD).width / 100);
      m.font = `700 ${size}px ${family}`;
      const metrics = m.measureText(WORD);
      const ascent = metrics.actualBoundingBoxAscent || size * 0.72;
      const tail = (metrics.actualBoundingBoxDescent || size * 0.2) * TAIL;
      h = Math.round(ascent + tail + 4);
      box.style.height = `${h}px`;

      m.canvas.width = w;
      m.canvas.height = h;
      m.font = `700 ${size}px ${family}`;
      m.textBaseline = "alphabetic";
      m.fillText(WORD, (w - metrics.width) / 2, h - tail);
      const px = m.getImageData(0, 0, w, h).data;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);

      const gap = Math.min(7, Math.max(2.6, w / 150));
      const out: number[] = [];
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          // Coverage: average alpha over a 3x3 sample of the cell.
          let sum = 0;
          for (let sy = -1; sy <= 1; sy++) {
            for (let sx = -1; sx <= 1; sx++) {
              const ix = Math.min(w - 1, Math.max(0, Math.round(x + (sx * gap) / 3)));
              const iy = Math.min(h - 1, Math.max(0, Math.round(y + (sy * gap) / 3)));
              sum += px[(iy * w + ix) * 4 + 3];
            }
          }
          const cover = sum / (9 * 255);
          if (cover < 0.06) continue;
          // Area-true radius, so tone stays even across the word.
          out.push(x, y, Math.sqrt(cover) * gap * 0.56);
        }
      }
      dots = new Float32Array(out);
    };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = INK;
      const t = start < 0 ? 0 : (now - start) / 1000;
      let done = true;
      for (let i = 0; i < dots.length; i += 3) {
        const x = dots[i];
        let k = 1;
        if (!reduced) {
          const p = (t - (x / w) * REVEAL) / GROW;
          k = p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.pow(1 - p, 3);
          if (k < 1) done = false;
        }
        if (k <= 0) continue;
        ctx.beginPath();
        ctx.arc(x, dots[i + 1], dots[i + 2] * k, 0, Math.PI * 2);
        ctx.fill();
      }
      return done;
    };

    const loop = (now: number) => {
      raf = draw(now) ? 0 : requestAnimationFrame(loop);
    };
    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };

    layout();
    redraw();

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && start < 0) {
          start = performance.now();
          redraw();
          io.disconnect();
        }
      },
      // Half visible, not a margin: at the foot of a phone page the whole
      // wordmark is only ~55px tall and sits on the bottom edge.
      { threshold: 0.5 }
    );
    io.observe(box);

    let lastW = w;
    const ro = new ResizeObserver(() => {
      if (Math.round(box.getBoundingClientRect().width) === lastW) return;
      layout();
      lastW = w;
      redraw();
    });
    ro.observe(box);

    // The display face can land after first paint; set the word again in it.
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      layout();
      redraw();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} aria-hidden style={{ position: "relative", width: "100%", height: "17vw", overflow: "hidden" }}>
      <canvas ref={canvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

export default function Footer() {
  const lenis = useLenis();
  const toTop = () => {
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0 });
  };

  return (
    <footer style={{ background: "transparent", borderTop: "1px solid var(--border)", paddingTop: 64, overflow: "hidden" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr repeat(4, 1fr)", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ marginBottom: 16 }}><Logo size={22} /></div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)", maxWidth: 260 }}>
              Prepare students. Connect employers. Track outcomes.
            </p>
          </div>

          {Object.entries(columns).map(([title, links]) => (
            <nav key={title} aria-label={title}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{title}</div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="footer-link" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.18s" }}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, paddingBottom: 32, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>© {new Date().getFullYear()} GradLeap. All rights reserved.</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
            <a href="/privacy" className="footer-link" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>Privacy Policy</a>
            <a href="/terms" className="footer-link" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>Terms and Conditions</a>
            <button type="button" onClick={toTop} className="footer-link footer-top">Back to top ↑</button>
          </div>
        </div>
      </div>

      <HalftoneWordmark />

      <style>{`
        .footer-link:hover { color: var(--text) !important; }
        .footer-top { font: inherit; font-size: 12px; color: var(--text-muted); background: none; border: none; padding: 0; cursor: pointer; }
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
