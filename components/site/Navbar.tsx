"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Logo from "../Logo";
import { Button } from "../ui/primitives";

const links = [
  { label: "Platform", href: "#product" },
  { label: "Students", href: "#readiness" },
  { label: "Employers", href: "#employers" },
  { label: "Colleges", href: "#analytics" },
  { label: "Analytics", href: "#analytics" },
  { label: "Pricing", href: "/pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? "rgba(10,10,10,0.72)" : "rgba(10,10,10,0.35)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        <nav
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 24px",
            height: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
          aria-label="Main"
        >
          <a href="#top" style={{ textDecoration: "none" }} aria-label="GradLink home">
            <Logo size={22} />
          </a>

          <ul
            className="nav-links"
            style={{ display: "flex", alignItems: "center", gap: 4, listStyle: "none" }}
          >
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="nav-link"
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-2)",
                    textDecoration: "none",
                    padding: "8px 14px",
                    borderRadius: "var(--r-sm)",
                    position: "relative",
                    transition: "color 0.18s ease",
                  }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="nav-cta" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a
              href="/sign-in"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-2)",
                textDecoration: "none",
                padding: "8px 14px",
              }}
            >
              Login
            </a>
            <Button href="/sign-up" variant="primary" className="nav-demo">
              Get Started
            </Button>
          </div>

          <button
            className="nav-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            style={{
              display: "none",
              background: "var(--glass)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              color: "var(--text)",
              width: 42,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </motion.header>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 110,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
              }}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "min(82vw, 340px)",
                zIndex: 120,
                background: "var(--bg-2)",
                borderLeft: "1px solid var(--border)",
                padding: "24px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Logo size={20} />
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  <X size={22} />
                </button>
              </div>
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--text)",
                    textDecoration: "none",
                    padding: "13px 12px",
                    borderRadius: "var(--r-sm)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {l.label}
                </a>
              ))}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Button href="/sign-up" variant="primary">Get Started</Button>
                <Button href="/sign-in" variant="secondary">Login</Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .nav-link:hover { color: var(--text) !important; }
        .nav-link::after {
          content: "";
          position: absolute;
          left: 14px; right: 14px; bottom: 4px;
          height: 1.5px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
          box-shadow: none;
        }
        .nav-link:hover::after { transform: scaleX(1); }
        @media (max-width: 920px) {
          .nav-links, .nav-cta { display: none !important; }
          .nav-burger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
