"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Check, ListChecks, Zap } from "lucide-react";
import { SectionCard, LoadingBlock, MeterBar } from "./cards";
import {
  getChecklistItems, getChecklistProgress, setChecklistProgress,
  getStudentByProfile, getCompanyByProfile, getScans, listMessagesForProfile, listShortlistsForCompany,
  type ChecklistItemRow,
} from "@/lib/db";
import type { AppRole } from "@/lib/session";

const PHASES: { key: ChecklistItemRow["phase"]; label: string; tone: string }[] = [
  { key: "pre_event", label: "Before the event", tone: "var(--cyan)" },
  { key: "during_event", label: "During the event", tone: "var(--teal)" },
  { key: "post_event", label: "After the event", tone: "var(--amber)" },
];

function lsKey(profileId: string) {
  return `gradlink.checklist.${profileId}`;
}

/** Student auto rules. Returns true/false if the item is auto-tracked, or null if it's manual. */
function autoRule(title: string, sig: StudentSignals): boolean | null {
  const t = title.toLowerCase();
  if (t.includes("complete your profile")) return sig.profileComplete;
  if (t.includes("upload your resume")) return sig.hasResume;
  if (t.includes("ai resume score")) return sig.hasResume;
  if (t.includes("portfolio")) return sig.hasLinks;
  if (t.includes("save target")) return sig.savedCount > 0;
  if (t.includes("show your qr")) return sig.scannedByCompany > 0;
  if (t.includes("scan companies")) return sig.scannedCompanies > 0;
  if (t.includes("visit your saved") || t.includes("booth visit")) return sig.visitedCount > 0;
  if (t.includes("send messages") || t.includes("follow-ups")) return sig.messagesSent > 0;
  return null;
}

interface StudentSignals {
  profileComplete: boolean; hasResume: boolean; hasSkills: boolean; hasLinks: boolean;
  savedCount: number; visitedCount: number; scannedByCompany: number; scannedCompanies: number; messagesSent: number;
}

async function loadStudentSignals(profileId: string, eventId: string): Promise<StudentSignals> {
  const [me, inbound, outbound, msgs] = await Promise.all([
    getStudentByProfile(profileId),
    getScans({ eventId, scannedProfileId: profileId }),
    getScans({ eventId, scannerProfileId: profileId }),
    listMessagesForProfile(profileId, eventId),
  ]);
  let saves: Record<string, { saved?: boolean; visited?: boolean }> = {};
  try { saves = JSON.parse(localStorage.getItem(`gradlink.saves.${profileId}`) || "{}"); } catch { /* ignore */ }
  const vals = Object.values(saves);
  return {
    profileComplete: !!(me?.degree && me?.graduation_year && (me?.skills?.length ?? 0) > 0 && me?.bio),
    hasResume: !!me?.resume_url,
    hasSkills: (me?.skills?.length ?? 0) > 0,
    hasLinks: !!(me?.linkedin_url || me?.github_url || me?.portfolio_url),
    savedCount: vals.filter((s) => s?.saved).length,
    visitedCount: vals.filter((s) => s?.visited).length,
    scannedByCompany: inbound.filter((s) => s.scanner_role === "company").length,
    scannedCompanies: outbound.length,
    messagesSent: msgs.filter((m) => m.sender_profile_id === profileId).length,
  };
}

function companyAutoRule(title: string, sig: CompanySignals): boolean | null {
  const t = title.toLowerCase();
  if (t.includes("complete company profile")) return sig.profileComplete;
  if (t.includes("hiring roles")) return sig.hasRoles;
  if (t.includes("scan student")) return sig.scannedStudents > 0;
  if (t.includes("shortlist candidates")) return sig.shortlistCount > 0;
  if (t.includes("add notes")) return sig.hasNotes;
  if (t.includes("message strong")) return sig.messagesSent > 0;
  return null;
}

interface CompanySignals {
  profileComplete: boolean; hasRoles: boolean; scannedStudents: number;
  shortlistCount: number; hasNotes: boolean; messagesSent: number;
}

async function loadCompanySignals(profileId: string, eventId: string): Promise<CompanySignals> {
  const [me, scans, shortlists, msgs] = await Promise.all([
    getCompanyByProfile(profileId),
    getScans({ eventId, scannerProfileId: profileId }),
    listShortlistsForCompany(profileId, eventId),
    listMessagesForProfile(profileId, eventId),
  ]);
  return {
    profileComplete: !!(me?.sector && me?.description && (me?.website || me?.logo_url)),
    hasRoles: (me?.hiring_roles?.length ?? 0) > 0,
    scannedStudents: scans.length,
    shortlistCount: shortlists.length,
    hasNotes: shortlists.some((s) => s.notes && s.notes.trim().length > 0),
    messagesSent: msgs.filter((m) => m.sender_profile_id === profileId).length,
  };
}

export default function Checklist({
  role,
  profileId,
  eventId,
}: {
  role: AppRole;
  profileId: string;
  eventId: string;
}) {
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [autoIds, setAutoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [openPhase, setOpenPhase] = useState<string>("pre_event");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await getChecklistItems(role, eventId);
      const dbProgress = await getChecklistProgress(profileId);
      let local: Record<string, boolean> = {};
      try { local = JSON.parse(localStorage.getItem(lsKey(profileId)) || "{}"); } catch { /* ignore */ }
      const base: Record<string, boolean> = { ...local, ...dbProgress };

      // Auto-tracked items reflect CURRENT activity (check when satisfied, uncheck when reversed).
      const managed = new Set<string>();
      const apply = (id: string, val: boolean) => {
        managed.add(id);
        if (!!base[id] !== val) setChecklistProgress(id, profileId, val); // keep DB in sync for managers
        base[id] = val;
      };
      if (role === "student") {
        const sig = await loadStudentSignals(profileId, eventId);
        for (const it of list) { const a = autoRule(it.title, sig); if (a !== null) apply(it.id, a); }
      } else if (role === "company") {
        const sig = await loadCompanySignals(profileId, eventId);
        for (const it of list) { const a = companyAutoRule(it.title, sig); if (a !== null) apply(it.id, a); }
      }
      if (cancelled) return;
      setItems(list);
      setAutoIds(managed);
      setDone(base);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [role, profileId, eventId]);

  async function toggle(item: ChecklistItemRow) {
    if (autoIds.has(item.id)) return; // auto items reflect real activity — not manually toggled
    const next = !done[item.id];
    const updated = { ...done, [item.id]: next };
    setDone(updated);
    try { localStorage.setItem(lsKey(profileId), JSON.stringify(updated)); } catch { /* ignore */ }
    await setChecklistProgress(item.id, profileId, next);
  }

  const grouped = useMemo(() => {
    const g: Record<string, ChecklistItemRow[]> = { pre_event: [], during_event: [], post_event: [] };
    items.forEach((i) => g[i.phase]?.push(i));
    return g;
  }, [items]);

  const totalDone = items.filter((i) => done[i.id]).length;
  const pct = items.length ? Math.round((totalDone / items.length) * 100) : 0;

  return (
    <SectionCard
      title="Event checklist"
      hint={role === "event_manager" ? `${totalDone}/${items.length} complete` : `${totalDone}/${items.length} · auto-tracked`}
      right={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--teal)" }}>
          <ListChecks size={14} /> {pct}%
        </span>
      }
    >
      {loading ? (
        <LoadingBlock label="Loading your checklist…" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MeterBar value={pct} tone="var(--teal)" />
          {PHASES.map((phase) => {
            const list = grouped[phase.key] ?? [];
            if (!list.length) return null;
            const phaseDone = list.filter((i) => done[i.id]).length;
            const open = openPhase === phase.key;
            return (
              <div key={phase.key} style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
                <button
                  onClick={() => setOpenPhase(open ? "" : phase.key)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text)" }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: phase.tone, boxShadow: `0 0 8px ${phase.tone}` }} />
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600 }}>{phase.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{phaseDone}/{list.length}</span>
                  <ChevronDown size={16} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {open && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 12px 12px" }}>
                    {list.map((item) => {
                      const checked = !!done[item.id];
                      const isAuto = autoIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item)}
                          style={{
                            display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left",
                            padding: "11px 12px", borderRadius: "var(--r-sm)", cursor: isAuto ? "default" : "pointer",
                            background: checked ? "rgba(0,194,168,0.06)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${checked ? "rgba(0,194,168,0.22)" : "var(--border)"}`,
                            transition: "all 0.15s",
                          }}
                        >
                          <span
                            style={{
                              width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: checked ? "var(--teal)" : "transparent",
                              border: `1.5px solid ${checked ? "var(--teal)" : "var(--text-muted)"}`,
                              transition: "all 0.15s",
                            }}
                          >
                            {checked && <Check size={13} color="#021016" strokeWidth={3} />}
                          </span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 500, color: checked ? "var(--text-2)" : "var(--text)", textDecoration: checked ? "line-through" : "none" }}>{item.title}</span>
                              {isAuto && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "var(--teal)", background: "rgba(0,194,168,0.10)", border: "1px solid rgba(0,194,168,0.25)", borderRadius: "var(--r-full)", padding: "1px 7px" }}>
                                  <Zap size={9} /> Auto
                                </span>
                              )}
                            </span>
                            {item.description && (
                              <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>{item.description}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
