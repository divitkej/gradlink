"use client";

import { useLenis } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Keeps GSAP ScrollTrigger in perfect sync with Lenis smooth scrolling.
 * Lenis runs in `root` mode (native scroll), so we only need to forward each
 * Lenis scroll frame to ScrollTrigger.update(). Rendered inside the Lenis tree.
 */
export default function ScrollSync() {
  useLenis(() => ScrollTrigger.update());
  return null;
}
