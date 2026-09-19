"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/** Thin gradient bar pinned to the top that scrubs from 0→100% as you scroll the page. */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.set(ref.current, { scaleX: 0, transformOrigin: "left center" });
    gsap.to(ref.current, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.3 },
    });
  });

  return (
    <div aria-hidden style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 200, pointerEvents: "none" }}>
      <div ref={ref} style={{ height: "100%", background: "linear-gradient(90deg, var(--cyan), var(--teal))", transformOrigin: "left center", boxShadow: "0 0 10px rgba(53,211,255,0.55)" }} />
    </div>
  );
}
