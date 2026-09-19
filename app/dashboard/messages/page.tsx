"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel } from "@/components/dashboard/widgets";
import { Avatar, LoadingBlock } from "@/components/dashboard/cards";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { useSession, DEMO_EVENT_ID } from "@/lib/demo-session";
import { listMessagesForProfile, getProfileNames, sendMessage, markMessagesRead, type MessageRow } from "@/lib/db";
import { notifyMessagesRead } from "@/lib/notifications";

export default function MessagesPage() {
  const { session, ready } = useSession();
  const me = session?.profileId ?? "";

  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [names, setNames] = useState<Record<string, { name: string; role: string; org: string }>>({});
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [mobile, setMobile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = () => setMobile(window.innerWidth < 760);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  async function load() {
    if (!me) return;
    const m = await listMessagesForProfile(me);
    const ids = m.flatMap((x) => [x.sender_profile_id, x.receiver_profile_id]).filter(Boolean) as string[];
    setNames(await getProfileNames(ids));
    setMsgs(m);
  }

  useEffect(() => {
    if (!ready || !session) return;
    let cancelled = false;
    (async () => { setLoading(true); await load(); if (!cancelled) setLoading(false); })();
    return () => { cancelled = true; };
  }, [ready, session]);

  const convs = useMemo(() => {
    const map = new Map<string, MessageRow[]>();
    for (const m of msgs) {
      const other = m.sender_profile_id === me ? m.receiver_profile_id : m.sender_profile_id;
      if (!other) continue;
      if (!map.has(other)) map.set(other, []);
      map.get(other)!.push(m);
    }
    return [...map.entries()]
      .map(([id, list]) => {
        list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
        return { id, name: names[id]?.name ?? "GradLink", role: names[id]?.role, list, last: list[list.length - 1] };
      })
      .sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
  }, [msgs, names, me]);

  const active = activeId ? convs.find((c) => c.id === activeId) : mobile ? undefined : convs[0];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.list.length, activeId]);

  // Mark the open conversation as read (clears the unread badge in the sidebar).
  const activeOpenId = active?.id;
  useEffect(() => {
    if (!activeOpenId || !me) return;
    const hasUnread = msgs.some((m) => m.sender_profile_id === activeOpenId && m.receiver_profile_id === me && !m.read_at);
    if (!hasUnread) return;
    (async () => {
      await markMessagesRead(me, activeOpenId);
      const now = new Date().toISOString();
      setMsgs((prev) => prev.map((m) =>
        m.sender_profile_id === activeOpenId && m.receiver_profile_id === me && !m.read_at ? { ...m, read_at: now } : m
      ));
      notifyMessagesRead();
    })();
  }, [activeOpenId, me, msgs]);

  async function send() {
    const text = reply.trim();
    if (!text || !active || !me) return;
    setSending(true);
    const temp: MessageRow = {
      id: "temp-" + Math.random().toString(36).slice(2),
      created_at: new Date().toISOString(),
      event_id: DEMO_EVENT_ID, sender_profile_id: me, receiver_profile_id: active.id, message: text, read_at: null,
    };
    setMsgs((p) => [...p, temp]);
    setReply("");
    await sendMessage({ eventId: DEMO_EVENT_ID, senderProfileId: me, receiverProfileId: active.id, message: text });
    setSending(false);
  }

  const showList = !mobile || !active;
  const showThread = !mobile || !!active;

  return (
    <DashboardShell title="Messages">
      {loading ? (
        <GlassPanel><LoadingBlock label="Loading messages…" /></GlassPanel>
      ) : convs.length === 0 ? (
        <GlassPanel>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "36px 24px 44px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: "rgba(53,211,255,0.08)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)" }}><MessageSquare size={22} /></div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>No conversations yet</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, lineHeight: 1.55 }}>Scan someone at the event and tap “Message” to start a conversation — it’ll show up here.</p>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel style={{ padding: 0, overflow: "hidden", height: "calc(100svh - 140px)", minHeight: 460, display: "grid", gridTemplateColumns: mobile ? "1fr" : "300px 1fr" }}>
          {/* conversation list */}
          {showList && (
            <div style={{ borderRight: mobile ? "none" : "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Inbox</div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {convs.map((c) => {
                  const on = active?.id === c.id;
                  const mine = c.last.sender_profile_id === me;
                  return (
                    <button key={c.id} onClick={() => setActiveId(c.id)}
                      style={{ width: "100%", display: "flex", gap: 11, alignItems: "center", padding: "12px 16px", cursor: "pointer", textAlign: "left", background: on ? "rgba(53,211,255,0.08)" : "transparent", border: "none", borderBottom: "1px solid var(--border)", borderLeft: `2px solid ${on ? "var(--cyan)" : "transparent"}` }}>
                      <Avatar name={c.name} size={38} tone={c.role === "company" ? "var(--teal)" : "var(--cyan)"} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mine ? "You: " : ""}{c.last.message}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* thread */}
          {showThread && (
            active ? (
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 11 }}>
                  {mobile && (
                    <button onClick={() => setActiveId(null)} aria-label="Back" style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", display: "flex" }}><ArrowLeft size={18} /></button>
                  )}
                  <Avatar name={active.name} size={34} tone={active.role === "company" ? "var(--teal)" : "var(--cyan)"} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{active.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "capitalize" }}>{(active.role ?? "").replace("_", " ")}</div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {active.list.map((m) => {
                    const mine = m.sender_profile_id === me;
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "76%", padding: "10px 14px", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: mine ? "linear-gradient(100deg, rgba(53,211,255,0.22), rgba(0,194,168,0.22))" : "rgba(255,255,255,0.05)", border: `1px solid ${mine ? "rgba(53,211,255,0.3)" : "var(--border)"}` }}>
                          <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5 }}>{m.message}</div>
                          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>{new Date(m.created_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={1} placeholder={`Message ${active.name.split(" ")[0]}…`}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    style={{ flex: 1, resize: "none", maxHeight: 120, padding: "11px 14px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none", fontFamily: "var(--font-body)" }} />
                  <button onClick={send} disabled={sending || !reply.trim()} aria-label="Send"
                    style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "var(--r-md)", border: "none", cursor: reply.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", color: "#021016", background: reply.trim() ? "linear-gradient(100deg, var(--cyan), var(--teal))" : "rgba(255,255,255,0.08)" }}>
                    <Send size={17} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13.5 }}>Select a conversation</div>
            )
          )}
        </GlassPanel>
      )}
    </DashboardShell>
  );
}
