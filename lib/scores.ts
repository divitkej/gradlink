/* ============================================================
   How coding profiles and certificates read on a profile, shared
   by the student's editor and the employer's view.
   ============================================================ */

export const CODING_SITE_LABEL = { leetcode: "LeetCode", codeforces: "Codeforces" } as const;

type ScoreLike = {
  kind: string;
  stats: Partial<{
    solved: number; easy: number; medium: number; hard: number; contestRating: number | null; contestsAttended: number; topPercent: number | null;
    rating: number | null; maxRating: number | null; rank: string | null; maxRank: string | null; contests: number;
  }>;
};

const n = (v: number) => v.toLocaleString("en-US");
const title = (v: string) => v.replace(/\b\w/g, (c) => c.toUpperCase());
const plural = (count: number, word: string) => `${n(count)} ${word}${count === 1 ? "" : "s"}`;

/** Up to two short lines describing a verified coding profile. */
export function scoreLines(r: ScoreLike): string[] {
  const st = r.stats ?? {};
  if (r.kind === "leetcode") {
    const lines = [`${plural(st.solved ?? 0, "problem")} solved · ${n(st.easy ?? 0)} easy, ${n(st.medium ?? 0)} medium, ${n(st.hard ?? 0)} hard`];
    if (st.contestRating != null) {
      lines.push([`Contest rating ${n(st.contestRating)}`, st.topPercent != null ? `top ${st.topPercent}%` : null, plural(st.contestsAttended ?? 0, "contest")].filter(Boolean).join(" · "));
    }
    return lines;
  }
  if (r.kind === "codeforces") {
    if (st.rating == null) return ["No rated contests yet"];
    return [[
      `Rating ${n(st.rating)}${st.rank ? ` (${title(st.rank)})` : ""}`,
      st.maxRating != null && st.maxRating !== st.rating ? `best ${n(st.maxRating)}${st.maxRank ? ` (${title(st.maxRank)})` : ""}` : null,
      plural(st.contests ?? 0, "rated contest"),
    ].filter(Boolean).join(" · ")];
  }
  return [];
}

/** "Mar 2025" from "2025-03-14", without any time zone shifting the day. */
export function monthYear(d: string | null | undefined): string | null {
  const m = d?.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, 15)).toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
}

/** "Issued Mar 2025 · expires Mar 2028", or "Expired Jan 2026" once past. */
export function certificateDates(c: { issued_on: string | null; expires_on: string | null }, today = new Date().toISOString().slice(0, 10)): string | null {
  const issued = monthYear(c.issued_on), expires = monthYear(c.expires_on);
  if (c.expires_on && c.expires_on < today) return [issued ? `Issued ${issued}` : null, `expired ${expires}`].filter(Boolean).join(" · ");
  return [issued ? `Issued ${issued}` : null, expires ? `expires ${expires}` : null].filter(Boolean).join(" · ") || null;
}

export const isExpired = (c: { expires_on: string | null }, today = new Date().toISOString().slice(0, 10)) => !!c.expires_on && c.expires_on < today;
