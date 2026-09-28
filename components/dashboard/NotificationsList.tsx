"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarCheck, CalendarClock, MessageSquare, Users } from "lucide-react";
import { GlassPanel } from "./widgets";
import { SectionCard, LoadingBlock } from "./cards";
import { listNotifications, markNotificationsRead, type NotificationRow } from "@/lib/db";
import { notifyAlertsRead, useUnreadMessages } from "@/lib/notifications";
import { fmtDateTime } from "@/lib/format";

const ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  interview_invite: CalendarCheck,
  interview_accepted: CalendarCheck,
  interview_declined: CalendarCheck,
  interview_cancelled: CalendarCheck,
  waitlist_promoted: CalendarClock,
  queue_called: Users,
};

/** Alerts for the signed-in account, newest first. Opening the page marks them read. */
export default function NotificationsList({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const { count: unreadMessages } = useUnreadMessages(profileId);

  useEffect(() => {
    let cancelled = false;
    listNotifications().then(async (list) => {
      if (cancelled) return;
      setRows(list);
      if (list.some((n) => !n.read_at)) {
        await markNotificationsRead();
        notifyAlertsRead();
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (!rows) return <GlassPanel><LoadingBlock label="Loading notifications…" /></GlassPanel>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <Link href="/dashboard/messages" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--glass)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textDecoration: "none" }}>
        <MessageSquare size={17} color="var(--accent)" />
        <span style={{ flex: 1, fontSize: 13.5, color: "var(--text)" }}>
          {unreadMessages ? `${unreadMessages} unread ${unreadMessages === 1 ? "message" : "messages"}` : "Messages"}
        </span>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Open →</span>
      </Link>

      <SectionCard title="Notifications" hint={rows.length ? `${rows.length} most recent` : undefined}>
        {rows.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "24px 12px", textAlign: "center" }}>
            <Bell size={20} color="var(--text-muted)" />
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, lineHeight: 1.55 }}>
              Interview invites, your turn in a booth queue and places opening up in sessions show up here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((n) => {
              const Icon = ICON[n.kind] ?? Bell;
              const body = (
                <>
                  <Icon size={16} color={n.read_at ? "var(--text-muted)" : "var(--accent)"} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: n.read_at ? 500 : 700, color: "var(--text)" }}>{n.title}</span>
                    {n.body && <span style={{ display: "block", fontSize: 12.5, color: "var(--text-2)", marginTop: 2 }}>{n.body}</span>}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDateTime(n.created_at)}</span>
                </>
              );
              const style: React.CSSProperties = {
                display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", textDecoration: "none",
                background: n.read_at ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${n.read_at ? "var(--border)" : "var(--border-strong)"}`, borderRadius: "var(--r-sm)",
              };
              return n.href
                ? <Link key={n.id} href={n.href} style={style}>{body}</Link>
                : <div key={n.id} style={style}>{body}</div>;
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
