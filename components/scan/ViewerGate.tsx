"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import Logo from "@/components/Logo";
import type { AppRole } from "@/lib/session";

const SIGN_IN_STYLE: React.CSSProperties = { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, padding: "0 22px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "#0A0A0A", background: "linear-gradient(100deg, var(--accent), var(--accent-2))", textDecoration: "none" };

const SIGN_UP_STYLE: React.CSSProperties = { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, padding: "0 22px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text)", background: "var(--glass)", border: "1px solid var(--border)", textDecoration: "none" };

/** Sign-in link that brings the person back to this exact page (with its ?eventId). */
function SignInLink() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const here = query ? `${pathname}?${query}` : pathname;
  return (
    <Link href={`/sign-in?next=${encodeURIComponent(here)}`} style={SIGN_IN_STYLE}>
      <LogIn size={17} /> Sign in
    </Link>
  );
}

/** Sign-up link that, like SignInLink, brings the person back to this page. */
function SignUpLink() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const here = query ? `${pathname}?${query}` : pathname;
  return (
    <Link href={`/sign-up?next=${encodeURIComponent(here)}`} style={SIGN_UP_STYLE}>
      <UserPlus size={17} /> Sign up
    </Link>
  );
}

/**
 * Shown when a QR is opened by someone who isn't signed in.
 * GradLink shows the right view based on your real account, so we ask them to sign in.
 */
export default function ViewerGate({ hint }: { onPick?: (r: AppRole) => void; hint?: string }) {
  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1 }}>
      <div style={{ marginBottom: 18 }}><Logo size={26} /></div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 8 }}>Sign in to view this</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", marginBottom: 28, maxWidth: 380, lineHeight: 1.55 }}>
        {hint ?? "GradLink shows this profile based on your account. Sign in and you will come straight back here."}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 360 }}>
        {/* useSearchParams needs a Suspense boundary; /scan is prerendered. */}
        <Suspense fallback={<Link href="/sign-in" style={SIGN_IN_STYLE}><LogIn size={17} /> Sign in</Link>}>
          <SignInLink />
        </Suspense>
        <Suspense fallback={<Link href="/sign-up" style={SIGN_UP_STYLE}><UserPlus size={17} /> Sign up</Link>}>
          <SignUpLink />
        </Suspense>
      </div>
    </div>
  );
}
