"use client";

import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";
import Logo from "@/components/Logo";
import { ROLE_LABEL, type AppRole } from "@/lib/session";

export default function ScanLayout({ viewerRole, children }: { viewerRole: AppRole; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px", background: "rgba(10,10,10,0.7)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/scan" aria-label="Back to scanner" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-2)", textDecoration: "none", fontSize: 13.5 }}>
          <ArrowLeft size={16} /> Scanner
        </Link>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><Logo size={20} /></div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-full)", padding: "4px 10px" }}>
          <ScanLine size={12} /> {ROLE_LABEL[viewerRole]}
        </span>
      </header>
      <main style={{ flex: 1, width: "100%", maxWidth: 760, margin: "0 auto", padding: "22px 18px 60px" }}>{children}</main>
    </div>
  );
}
