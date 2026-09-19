"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, QrCode, UserCircle, ListChecks, CalendarDays, Building2,
  MessageSquare, BarChart3, Users, Briefcase, ScanLine,
  Search, Bell, Menu, X, BookOpen, Network, LogOut, History,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useSession, DEMO_EVENT_ID, ROLE_LABEL, type AppRole } from "@/lib/demo-session";
import { useUnreadMessages } from "@/lib/notifications";
import { Avatar } from "./cards";

export type DashRole = AppRole;

const EV = `/events/${DEMO_EVENT_ID}`;

const NAV: Record<AppRole, { label: string; href: string; icon: React.ComponentType<{ size?: number }> }[]> = {
  student: [
    { label: "Overview", href: "/dashboard/student", icon: LayoutDashboard },
    { label: "Event", href: EV, icon: CalendarDays },
    { label: "My QR", href: "/dashboard/student#qr", icon: QrCode },
    { label: "Scanner", href: "/scan", icon: ScanLine },
    { label: "Checklist", href: "/dashboard/student#checklist", icon: ListChecks },
    { label: "Companies", href: "/dashboard/student#companies", icon: Building2 },
    { label: "Career Profile", href: "/dashboard/profile", icon: UserCircle },
    { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    { label: "Manual", href: "/dashboard/student#manual", icon: BookOpen },
  ],
  company: [
    { label: "Overview", href: "/dashboard/company", icon: LayoutDashboard },
    { label: "Event", href: EV, icon: CalendarDays },
    { label: "Company QR", href: "/dashboard/company#qr", icon: QrCode },
    { label: "Company Profile", href: "/dashboard/profile", icon: UserCircle },
    { label: "Scanner", href: "/scan", icon: ScanLine },
    { label: "Candidates", href: "/dashboard/company#students", icon: Users },
    { label: "Pre-shortlist", href: `${EV}#people`, icon: ListChecks },
    { label: "Pipeline", href: "/dashboard/company#pipeline", icon: Network },
    { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    { label: "Manual", href: "/dashboard/company#manual", icon: BookOpen },
  ],
  event_manager: [
    { label: "Overview", href: "/dashboard/event-manager", icon: LayoutDashboard },
    { label: "Event", href: EV, icon: CalendarDays },
    { label: "Scanner", href: "/scan", icon: ScanLine },
    { label: "Students", href: "/dashboard/event-manager#students", icon: Users },
    { label: "Employers", href: "/dashboard/event-manager#employers", icon: Briefcase },
    { label: "Analytics", href: "/dashboard/event-manager#analytics", icon: BarChart3 },
    { label: "Scan Monitor", href: "/dashboard/event-manager#scans", icon: History },
    { label: "Manual", href: "/dashboard/event-manager#manual", icon: BookOpen },
  ],
};

function roleHome(role: AppRole) {
  return role === "event_manager" ? "/dashboard/event-manager" : `/dashboard/${role}`;
}

export default function DashboardShell({
  role,
  title,
  children,
}: {
  role?: DashRole;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const { count: unread } = useUnreadMessages(session?.profileId);

  // Auth gate + role lock: must be signed in, and can only view your own role's pages.
  useEffect(() => {
    if (!ready) return;
    if (!session) { router.replace("/sign-in"); return; }
    if (role && session.role !== role) { router.replace(roleHome(session.role)); }
  }, [ready, session, role, router]);

  if (!ready || !session || (role && session.role !== role)) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)" }}>
          <Logo size={22} />
          <span style={{ fontSize: 14 }}>Loading workspace…</span>
        </div>
      </div>
    );
  }

  const activeRole: AppRole = session.role;
  const nav = NAV[activeRole];
  const displayName = session.name || "Your account";
  const displayOrg = session.org || "";

  const Sidebar = (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px" }} aria-label="Dashboard">
      {nav.map((item) => {
        const Icon = item.icon;
        const on = item.href === pathname || (item.label === "Overview" && pathname === roleHome(activeRole));
        const showBadge = item.href === "/dashboard/messages" && unread > 0;
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setOpen(false)}
            className="dash-nav"
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "9px 12px",
              borderRadius: "var(--r-md)", fontSize: 13.5, fontWeight: 500, textDecoration: "none",
              color: on ? "var(--text)" : "var(--text-2)",
              background: on ? "rgba(53,211,255,0.10)" : "transparent",
              border: `1px solid ${on ? "var(--border-strong)" : "transparent"}`,
              transition: "all 0.15s",
            }}
          >
            <Icon size={17} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {showBadge && (
              <span
                aria-label={`${unread} unread message${unread === 1 ? "" : "s"}`}
                style={{
                  minWidth: 18, height: 18, padding: "0 5px", borderRadius: "var(--r-full)",
                  background: "var(--amber)", color: "#1a1206", fontSize: 11, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 8px rgba(247,201,72,0.5)",
                }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const Footer = (
    <div style={{ padding: 14, borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px" }}>
        <Avatar name={displayName} size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ROLE_LABEL[activeRole]}{displayOrg ? ` · ${displayOrg}` : ""}</div>
        </div>
        <button
          onClick={() => { signOut(); router.replace("/sign-in"); }}
          aria-label="Sign out"
          title="Sign out"
          style={{ background: "var(--glass)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text-2)", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100svh", position: "relative", zIndex: 1 }}>
      <aside
        className="dash-sidebar"
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 248, zIndex: 40,
          background: "rgba(7,18,32,0.72)", backdropFilter: "blur(16px)",
          borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <Link href="/" style={{ textDecoration: "none" }}><Logo size={20} /></Link>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{Sidebar}</div>
        {Footer}
      </aside>

      <div className="dash-main" style={{ marginLeft: 248, display: "flex", flexDirection: "column", minHeight: "100svh" }}>
        <header
          style={{
            position: "sticky", top: 0, zIndex: 30, height: 64,
            display: "flex", alignItems: "center", gap: 14, padding: "0 20px",
            background: "rgba(5,11,20,0.6)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)",
          }}
        >
          <button className="dash-burger" onClick={() => setOpen(true)} aria-label="Open menu"
            style={{ display: "none", background: "var(--glass)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text)", width: 40, height: 40, alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Menu size={18} />
          </button>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{title}</h1>
          <span className="dash-rolechip" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "var(--cyan)", background: "rgba(53,211,255,0.08)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-full)", padding: "3px 10px" }}>
            {ROLE_LABEL[activeRole]}
          </span>
          <div style={{ flex: 1 }} />
          <div className="dash-search" style={{ position: "relative", display: "flex", alignItems: "center", width: 220 }}>
            <Search size={15} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
            <input placeholder="Search…" aria-label="Search" className="gl-input"
              style={{ width: "100%", height: 38, padding: "0 12px 0 34px", fontSize: 13, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-full)", outline: "none" }} />
          </div>
          <button
            onClick={() => router.push("/dashboard/messages")}
            aria-label={unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Notifications"}
            title={unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Notifications"}
            style={{ position: "relative", background: "var(--glass)", border: "1px solid var(--border)", borderRadius: "var(--r-full)", color: "var(--text-2)", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Bell size={17} />
            {unread > 0 && (
              <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", boxShadow: "0 0 6px var(--amber)" }} />
            )}
          </button>
          <Avatar name={displayName} size={38} />
        </header>

        <main style={{ flex: 1, padding: "clamp(16px, 3vw, 32px)", maxWidth: 1280, width: "100%", margin: "0 auto" }}>
          {children}
        </main>
      </div>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(2,8,15,0.6)", backdropFilter: "blur(4px)" }} />
          <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(82vw, 300px)", zIndex: 60, background: "var(--bg-2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Logo size={20} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>{Sidebar}</div>
            {Footer}
          </aside>
        </>
      )}

      <style>{`
        .dash-nav:hover { color: var(--text) !important; background: rgba(255,255,255,0.04); }
        .gl-input:focus { border-color: var(--border-strong) !important; box-shadow: 0 0 0 3px rgba(53,211,255,0.12); }
        @media (max-width: 920px) {
          .dash-sidebar { display: none !important; }
          .dash-main { margin-left: 0 !important; }
          .dash-burger { display: flex !important; }
          .dash-search { width: 150px !important; }
        }
        @media (max-width: 560px) { .dash-search, .dash-rolechip { display: none !important; } }
      `}</style>
    </div>
  );
}
