/* ============================================================
   Event engagement score, 0 to 100.

   Shared by the Worker (leaderboard and manager analytics) and the
   student dashboard (the breakdown shown to the student), so both
   always agree. Each activity earns points up to a cap, and the caps
   add up to 100.
   ============================================================ */

export interface EngagementCounts {
  checked_in: boolean;
  booths_visited: number;
  recruiter_scans: number;
  shortlists: number;
  sessions_attended: number;
  sessions_booked: number;
  follow_ups: number;
}

export interface EngagementLine {
  key: string;
  label: string;
  earned: number;
  max: number;
  hint: string;
}

const RULES: { key: string; label: string; max: number; hint: string; earn: (c: EngagementCounts) => number }[] = [
  { key: "checked_in", label: "Checked in", max: 10, hint: "Have the event team scan your QR at the entrance.", earn: (c) => (c.checked_in ? 10 : 0) },
  { key: "booths", label: "Booths visited", max: 20, hint: "4 points for each company booth you scan.", earn: (c) => c.booths_visited * 4 },
  { key: "recruiter_scans", label: "Recruiters who scanned you", max: 24, hint: "6 points for each company that scans your QR.", earn: (c) => c.recruiter_scans * 6 },
  { key: "shortlists", label: "Shortlists", max: 16, hint: "8 points each time a company shortlists you.", earn: (c) => c.shortlists * 8 },
  { key: "sessions", label: "Sessions", max: 18, hint: "6 points per session attended, 2 per session booked.", earn: (c) => c.sessions_attended * 6 + c.sessions_booked * 2 },
  { key: "follow_ups", label: "Follow-ups sent", max: 12, hint: "4 points for each company you message.", earn: (c) => c.follow_ups * 4 },
];

export function engagementBreakdown(c: EngagementCounts): EngagementLine[] {
  return RULES.map((r) => ({ key: r.key, label: r.label, max: r.max, hint: r.hint, earned: Math.min(r.max, r.earn(c)) }));
}

export function engagementScore(c: EngagementCounts): number {
  return engagementBreakdown(c).reduce((sum, l) => sum + l.earned, 0);
}

/** "Sara Al Rashidi" becomes "Sara R." so the leaderboard never shows full names. */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Student";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
