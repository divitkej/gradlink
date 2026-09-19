"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CanvasRevealEffect } from "@/components/ui/sign-in-flow-1";
import Logo from "@/components/Logo";

/**
 * Shared chrome for auth pages (sign-in / sign-up): themed dot-matrix reveal
 * over the global background, branded header, centered content slot.
 */
export default function AuthShell({
  children,
  backHref = "/",
  backLabel = "Back to site",
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.55,
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 45%, black 0%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 45%, black 0%, transparent 78%)",
        }}
      >
        <CanvasRevealEffect
          animationSpeed={3}
          colors={[
            [0, 194, 168],
            [53, 211, 255],
          ]}
          dotSize={4}
          containerClassName=""
          showGradient={false}
        />
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 50% 45% at 50% 46%, rgba(0,194,168,0.12), transparent 60%), radial-gradient(ellipse 90% 80% at 50% 50%, transparent 45%, rgba(3,8,15,0.6) 100%)",
        }}
      />

      <header
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "22px 24px",
          maxWidth: 1240,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Link href="/" aria-label="GradLink home" style={{ textDecoration: "none" }}>
          <Logo size={22} />
        </Link>
        <Link
          href={backHref}
          className="gl-back"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13.5,
            color: "var(--text-2)",
            textDecoration: "none",
            padding: "8px 14px",
            borderRadius: "var(--r-full)",
            border: "1px solid var(--border)",
            background: "var(--glass)",
            backdropFilter: "blur(10px)",
            transition: "all 0.18s",
          }}
        >
          <ArrowLeft size={15} />
          {backLabel}
        </Link>
      </header>

      <main
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 24px 56px",
        }}
      >
        {children}
      </main>

      <style>{`
        .gl-back:hover { color: var(--text) !important; border-color: var(--border-strong) !important; }
      `}</style>
    </div>
  );
}
