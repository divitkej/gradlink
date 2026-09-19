"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { useSession } from "@/lib/demo-session";

function roleHome(role: string) {
  return role === "event_manager" ? "/dashboard/event-manager" : `/dashboard/${role}`;
}

export default function DashboardHome() {
  const router = useRouter();
  const { session, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    router.replace(session ? roleHome(session.role) : "/sign-in");
  }, [ready, session, router]);

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)" }}>
        <Logo size={22} />
        <span style={{ fontSize: 14 }}>Taking you to your dashboard…</span>
      </div>
    </main>
  );
}
