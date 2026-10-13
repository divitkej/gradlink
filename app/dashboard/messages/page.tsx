"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel } from "@/components/dashboard/widgets";
import { Avatar, LoadingBlock } from "@/components/dashboard/cards";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import { listMessagesForProfile, getProfileNames, sendMessage, markMessagesRead, type MessageRow } from "@/lib/db";
import { notifyMessagesRead } from "@/lib/notifications";

/**
 * How often an open inbox checks for new messages. Only while the tab is
 * visible, like the unread badge (lib/notifications.ts), so a background tab
 * does not keep Neon from scaling to zero.
 */
const POLL_MS = 15_000;

export default function MessagesPage() {
  const { session, ready } = useSession();
  const { eventId } = useActiveEvent();
  const me = session?.profileId ?? "";

  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [names, setNames] = useState<Record<string, { name: string; role: string; org: string }>>({});
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Optimistic messages whose send has not succeeded yet. Kept on screen
  // across reloads until the server copy replaces them.
  const pendingRef = useRef(new Set<string>());
  // Reloads the inbox; set by the effect below while an inbox is open.
  const reloadRef = useRef<() => void>(() => {});

  useEffect(() => {
    const f = () => setMobile(window.innerWidth < 760);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  // Load the inbox, then keep it current so an open conversation shows replies
  // without a page reload.
  useEffect(() => {
    if (!ready || !me || !eventId) return;
    let cancelled = false;
    let seq = 0;
    let known: Record<string, { name: string; role: string; org: string }> = {};
    const load = async (initial: boolean) => {
      // Numbered, so a slow response cannot overwrite a newer one.
      const mine = ++seq;
      if (initial) setLoading(true);
      const m = await listMessagesForProfile(me, eventId);
      const ids = m.flatMap((x) => [x.sender_profile_id, x.receiver_profile_id]).filter(Boolean) as string[];
      // Names only change when someone new writes, so reloads usually skip this.
      if (initial || ids.some((id) => !known[id])) {
        const resolved = await getProfileNames(ids);
        if (initial || Object.keys(resolved).length > 0) known = resolved;
      }
      if (cancelled || mine !== seq) return;
      setNames(known);
      setMsgs((prev) => {
        // A failed reload comes back empty. Messages are never deleted, so an
        // empty reload after a full inbox means "try again", not "clear it".
        if (!initial && m.length === 0 && prev.length > 0) return prev;
        return [...m, ...prev.filter((x) => pendingRef.current.has(x.id) && x.event_id === eventId)];
      });
      setLoading(false);
    };
    load(true);
    reloadRef.current = () => { load(false); };
    const onFocus = () => load(false);
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load(false);
    }, POLL_MS);
    return () => {
      cancelled = true;
      reloadRef.current = () => {};
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [ready, me, eventId]);

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
    if (!text || !active || !me || !eventId) return;
    setSending(true);
    setSendError(null);
    const temp: MessageRow = {
      id: "temp-" + Math.random().toString(36).slice(2),
      created_at: new Date().toISOString(),
      event_id: eventId, sender_profile_id: me, receiver_profile_id: active.id, message: text, read_at: null,
    };
    pendingRef.current.add(temp.id);
    setMsgs((p) => [...p, temp]);
    setReply("");
    const ok = await sendMessage({ eventId, senderProfileId: me, receiverProfileId: active.id, message: text });
    setSending(false);
    pendingRef.current.delete(temp.id);
    if (!ok) {
      // Take the unsent message back out of the thread and give the text back.
      setMsgs((p) => p.filter((m) => m.id !== temp.id));
      setReply(text);
      setSendError("Message not sent. Check your connection and try again.");
      return;
    }
    // Saved: swap the optimistic copy for the server's.
    reloadRef.current();
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
            <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}><MessageSquare size={22} /></div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>No conversations yet</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, lineHeight: 1.55 }}>Scan someone at the event and tap “Message” to start a conversation. It’ll show up here.</p>
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
                      style={{ width: "100%", display: "flex", gap: 11, alignItems: "center", padding: "12px 16px", cursor: "pointer", textAlign: "left", background: on ? "rgba(255,255,255,0.08)" : "transparent", border: "none", borderBottom: "1px solid var(--border)", borderLeft: `2px solid ${on ? "var(--accent)" : "transparent"}` }}>
                      <Avatar name={c.name} size={38} tone={c.role === "company" ? "var(--accent-2)" : "var(--accent)"} />
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
                  <Avatar name={active.name} size={34} tone={active.role === "company" ? "var(--accent-2)" : "var(--accent)"} />
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
                        <div style={{ maxWidth: "76%", padding: "10px 14px", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: mine ? "linear-gradient(100deg, rgba(255,255,255,0.22), rgba(255,255,255,0.22))" : "rgba(255,255,255,0.05)", border: `1px solid ${mine ? "rgba(255,255,255,0.3)" : "var(--border)"}` }}>
                          <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5 }}>{m.message}</div>
                          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>{new Date(m.created_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {sendError && (
                  <div role="alert" style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--danger)" }}>{sendError}</div>
                )}
                <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={1} placeholder={`Message ${active.name.split(" ")[0]}…`}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    style={{ flex: 1, resize: "none", maxHeight: 120, padding: "11px 14px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none", fontFamily: "var(--font-body)" }} />
                  <button onClick={send} disabled={sending || !reply.trim()} aria-label="Send"
                    style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "var(--r-md)", border: "none", cursor: reply.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0A0A", background: reply.trim() ? "linear-gradient(100deg, var(--accent), var(--accent-2))" : "rgba(255,255,255,0.08)" }}>
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
