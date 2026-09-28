"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStudentByProfile, getRegisteredCompanies, listSessions, listSavedCompanies, getScans,
  listShortlistsForStudent, listMessagesForProfile, getStudentEventInsights, getChecklistItems,
  getChecklistProgress, getProfileNames, listInterviewInvitesForStudent, listMyQueues,
  type StudentRow, type CompanyRow, type SessionRow, type SavedCompanyRow, type ScanRow,
  type ShortlistRow, type MessageRow, type StudentInsights, type InterviewInviteRow, type MyQueueRow,
} from "./db";
import type { StudentActivity } from "./readiness";

/**
 * Everything the student dashboard pages read for one event, loaded in
 * parallel. Pages derive readiness, the passport and the plan from this.
 */
export interface StudentData {
  me: StudentRow | null;
  companies: CompanyRow[];
  sessions: SessionRow[];
  saved: SavedCompanyRow[];
  /** Scans of the student (by recruiters or the event team). */
  scansIn: ScanRow[];
  /** Scans the student made (company booths). */
  scansOut: ScanRow[];
  shortlists: ShortlistRow[];
  messages: MessageRow[];
  insights: StudentInsights | null;
  checklistPct: number;
  names: Record<string, { name: string; role: string; org: string }>;
  /** Interview invites from any event, pending first. */
  invites: InterviewInviteRow[];
  /** Booth queues the student is in at this event. */
  queues: MyQueueRow[];
}

export function activityOf(d: StudentData, profileId: string): StudentActivity {
  const companiesMessaged = new Set(
    d.messages
      .filter((m) => m.sender_profile_id === profileId && m.receiver_profile_id && d.names[m.receiver_profile_id]?.role === "company")
      .map((m) => m.receiver_profile_id),
  ).size;
  return {
    sessions: d.sessions,
    saved: d.saved,
    companiesMessaged,
    checkedIn: d.insights?.me?.counts.checked_in ?? d.scansIn.some((s) => s.scanner_role === "event_manager"),
    checklistPct: d.checklistPct,
  };
}

export function useStudentData(profileId: string, eventId: string) {
  const [data, setData] = useState<StudentData | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!profileId || !eventId) return;
    let cancelled = false;
    (async () => {
      const [me, companies, sessions, saved, scansIn, scansOut, shortlists, messages, insights, items, progress, invites, queues] = await Promise.all([
        getStudentByProfile(profileId),
        getRegisteredCompanies(eventId),
        listSessions(eventId),
        listSavedCompanies(eventId),
        getScans({ eventId, scannedProfileId: profileId }),
        getScans({ eventId, scannerProfileId: profileId }),
        listShortlistsForStudent(profileId, eventId),
        listMessagesForProfile(profileId, eventId),
        getStudentEventInsights(eventId),
        getChecklistItems("student", eventId),
        getChecklistProgress(profileId),
        listInterviewInvitesForStudent(),
        listMyQueues(eventId),
      ]);
      const ids = [
        ...scansIn.map((s) => s.scanner_profile_id),
        ...scansOut.map((s) => s.scanned_profile_id),
        ...messages.flatMap((m) => [m.sender_profile_id, m.receiver_profile_id]),
      ].filter((x): x is string => !!x && x !== profileId);
      const names = await getProfileNames(ids);
      if (cancelled) return;
      const done = items.filter((i) => progress[i.id]).length;
      setData({
        me, companies, sessions, saved, scansIn, scansOut, shortlists, messages, insights, names, invites, queues,
        checklistPct: items.length ? Math.round((done / items.length) * 100) : 0,
      });
    })();
    return () => { cancelled = true; };
  }, [profileId, eventId, version]);

  /** Refetch everything, for example after booking a session. */
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const patch = useCallback((fn: (d: StudentData) => StudentData) => setData((d) => (d ? fn(d) : d)), []);

  return { data, loading: data === null, reload, patch };
}
