"use client";

import { Check, Trophy } from "lucide-react";
import { GlassPanel } from "./widgets";
import { SectionCard, LoadingBlock, ScoreRing } from "./cards";
import { Meter } from "@/components/ui/primitives";
import { useSession } from "@/lib/session";
import { useStudentData, type StudentData } from "@/lib/use-student-data";
import { engagementBreakdown } from "@/lib/engagement";
import { fmtDay, fmtTime, sessionPhase } from "@/lib/format";

interface Stop {
  key: string;
  label: string;
  at: string;
  done: boolean;
}

/** Every step of the student's event, oldest first, then what is still planned. */
function stops(d: StudentData, profileId: string): Stop[] {
  const company = (id: string | null) => {
    if (!id) return "a company";
    const c = d.companies.find((x) => (x.profile_id ?? x.id) === id);
    return c?.company_name ?? c?.company ?? d.names[id]?.org ?? d.names[id]?.name ?? "a company";
  };
  const firstBy = <T,>(rows: T[], key: (r: T) => string | null) => {
    const seen = new Map<string, T>();
    for (const r of rows) { const k = key(r); if (k && !seen.has(k)) seen.set(k, r); }
    return Array.from(seen.values());
  };
  const asc = <T extends { created_at: string }>(rows: T[]) => [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const done: Stop[] = [];
  const checkIn = asc(d.scansIn).find((s) => s.scanner_role === "event_manager");
  if (checkIn) done.push({ key: `in-${checkIn.id}`, label: "Checked in at the event", at: checkIn.created_at, done: true });
  for (const s of d.sessions.filter((x) => x.my_status === "attended")) {
    done.push({ key: `att-${s.id}`, label: `Attended ${s.title}`, at: s.starts_at, done: true });
  }
  for (const s of firstBy(asc(d.scansOut.filter((x) => x.scanned_role === "company")), (x) => x.scanned_profile_id)) {
    done.push({ key: `booth-${s.id}`, label: `Visited the ${company(s.scanned_profile_id)} booth`, at: s.created_at, done: true });
  }
  const scannedBooths = new Set(d.scansOut.map((s) => s.scanned_profile_id));
  for (const s of d.saved.filter((x) => x.visited && !scannedBooths.has(x.company_id))) {
    done.push({ key: `mark-${s.company_id}`, label: `Visited the ${company(s.company_id)} booth`, at: s.updated_at, done: true });
  }
  for (const s of firstBy(asc(d.scansIn.filter((x) => x.scanner_role === "company")), (x) => x.scanner_profile_id)) {
    done.push({ key: `scan-${s.id}`, label: `${company(s.scanner_profile_id)} scanned your profile`, at: s.created_at, done: true });
  }
  for (const s of d.shortlists.filter((x) => x.status === "shortlisted" || x.status === "priority")) {
    done.push({ key: `sl-${s.id}`, label: "A company shortlisted you", at: s.created_at, done: true });
  }
  const sent = asc(d.messages.filter((m) => m.sender_profile_id === profileId && m.receiver_profile_id && d.names[m.receiver_profile_id]?.role === "company"));
  for (const m of firstBy(sent, (x) => x.receiver_profile_id)) {
    done.push({ key: `msg-${m.id}`, label: `Followed up with ${company(m.receiver_profile_id)}`, at: m.created_at, done: true });
  }
  done.sort((a, b) => a.at.localeCompare(b.at));

  const planned: Stop[] = d.sessions
    .filter((s) => s.my_status === "booked" && sessionPhase(s) !== "ended")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((s) => ({ key: `plan-${s.id}`, label: s.title, at: s.starts_at, done: false }));
  for (const s of d.saved.filter((x) => x.saved && !x.visited && !scannedBooths.has(x.company_id))) {
    planned.push({ key: `visit-${s.company_id}`, label: `Visit the ${company(s.company_id)} booth`, at: "", done: false });
  }
  return [...done, ...planned];
}

export default function StudentPassport({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const profileId = session?.profileId ?? "";
  const { data, loading } = useStudentData(profileId, eventId);

  if (loading || !data) return <GlassPanel><LoadingBlock label="Loading your passport…" /></GlassPanel>;

  const list = stops(data, profileId);
  const complete = list.filter((s) => s.done).length;
  const ins = data.insights;
  const lines = ins?.me ? engagementBreakdown(ins.me.counts) : [];
  const meInTop = ins?.leaderboard.some((r) => r.isMe);

  return (
    <div className="pp-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 4fr)", gap: 20, alignItems: "start" }}>
      <SectionCard title="Digital passport" hint={list.length ? `${complete} of ${list.length} stops complete` : undefined}>
        {list.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Your passport fills in as you go: check-in, sessions you attend, booths you scan, recruiters who scan you and the follow-ups you send.
            Book sessions and save companies to see your planned stops here.
          </p>
        ) : (
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
            {list.map((p, i) => (
              <li key={p.key} style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: p.done ? "var(--accent)" : "var(--surface-elev)", border: p.done ? "none" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {p.done ? <Check size={13} color="#0A0A0A" strokeWidth={3} /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)" }} />}
                  </div>
                  {i < list.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 22, background: p.done && list[i + 1].done ? "var(--accent-2)" : "var(--border)" }} />}
                </div>
                <div style={{ paddingBottom: i < list.length - 1 ? 16 : 0, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: p.done ? 600 : 400, color: p.done ? "var(--text)" : "var(--text-2)" }}>{p.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>
                    {p.at ? `${p.done ? "" : "Planned · "}${fmtDay(p.at)}, ${fmtTime(p.at)}` : "Planned"}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SectionCard title="Engagement score" hint={ins?.me ? `Rank ${ins.me.rank} of ${ins.total}` : undefined}>
          {!ins?.me ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Your score appears once you are registered for this event.</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
                <ScoreRing score={ins.me.score} label="/ 100" />
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>
                  Points for what you do at the event. Each activity has a cap, so the score rewards doing a bit of everything.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lines.map((l) => (
                  <div key={l.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: "var(--text-2)" }}>{l.label}</span>
                      <span style={{ color: "var(--text)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{l.earned}/{l.max}</span>
                    </div>
                    <Meter value={(l.earned / l.max) * 100} tone={l.earned >= l.max ? "var(--accent)" : "var(--accent-2)"} height={5} />
                    {l.earned < l.max && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{l.hint}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Engagement leaderboard" right={<Trophy size={15} color="var(--text-muted)" />}>
          {!ins || ins.leaderboard.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No activity at this event yet. The first scans and sessions put students on the board.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {ins.leaderboard.map((r) => (
                <div key={`${r.rank}-${r.name}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: "var(--r-sm)", background: r.isMe ? "rgba(255,255,255,0.07)" : "transparent" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 700, color: r.rank === 1 ? "var(--text)" : "var(--text-muted)", width: 18 }}>{r.rank}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{r.isMe ? `${r.name} (you)` : r.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: r.isMe ? "var(--text)" : "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{r.score}</span>
                </div>
              ))}
              {!meInTop && ins.me && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", marginTop: 6, borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.04)" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", width: 18 }}>{ins.me.rank}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>You</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{ins.me.score}</span>
                </div>
              )}
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>
                Other students are shown by first name and last initial. Scores update each time you open this page.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      <style>{`@media (max-width: 960px) { .pp-grid { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
    </div>
  );
}
