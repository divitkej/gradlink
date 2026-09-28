import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";

/** Shown for any address that doesn't exist on the site. */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "70svh", display: "flex", alignItems: "center", justifyContent: "center", padding: "140px 24px 80px" }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
            404
          </p>
          <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", fontWeight: 700, lineHeight: 1.15, marginBottom: 14 }}>
            This page doesn&apos;t exist
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-2)", marginBottom: 28 }}>
            The link may be mistyped or out of date. Check the address, or go back to the home page.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", height: 44, padding: "0 20px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#0A0A0A", background: "var(--accent)", textDecoration: "none" }}>
              Go to the home page
            </Link>
            <Link href="/sign-in" style={{ display: "inline-flex", alignItems: "center", height: 44, padding: "0 20px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--text)", border: "1px solid var(--border-strong)", textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
