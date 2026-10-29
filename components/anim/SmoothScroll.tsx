"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";

/**
 * Lenis smooth scroll (root). Disabled to native instant scroll under
 * prefers-reduced-motion. Root mode renders children without an extra
 * wrapper element, so it stays hydration-safe.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <ReactLenis
      root
      options={{
        lerp: reduce ? 1 : 0.09,
        duration: reduce ? 0 : 1.15,
        smoothWheel: !reduce,
      }}
    >
      <SectionLinks />
      {children}
    </ReactLenis>
  );
}

/**
 * Links to home page sections (`/#platform`, `#journey`, ...) scroll there
 * without leaving the `#section` in the address bar. Arriving from another
 * page with one scrolls to the section, then drops it from the address. The
 * plain `href` stays on every link, so they still work before JavaScript runs.
 */
function SectionLinks() {
  const lenis = useLenis();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const scrollToSection = (id: string, immediate: boolean) => {
      const el = id ? document.getElementById(id) : null;
      if (!el) return false;
      // From the window's real position: Lenis's own record can lag behind a
      // scroll it did not make, and it would then stop short of the section.
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(top, { immediate });
      else window.scrollTo({ top, behavior: immediate ? "auto" : "smooth" });
      return true;
    };

    const fromAddress = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (hash && scrollToSection(hash, true)) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      }
    };
    fromAddress();
    // A section typed into the address bar while already on this page.
    window.addEventListener("hashchange", fromAddress);

    const onClick = (e: MouseEvent) => {
      // New-tab and modified clicks keep the browser's own behaviour.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href");
      if (!href || link?.getAttribute("target")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/" || !url.hash) return;
      if (scrollToSection(decodeURIComponent(url.hash.slice(1)), false)) e.preventDefault();
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", fromAddress);
    };
  }, [pathname, lenis]);

  return null;
}
