/* ============================================================
   Test scores a student can add to their profile. None of these
   exams lets another site check a score, so they are shown to
   employers as self-reported. Known exams are checked against their
   real score range so a typo can't produce an impossible score.
   ============================================================ */

export interface TestKind {
  key: string;
  label: string;
  /** Inclusive range, and the step scores move in (0: any decimal). Null range: free text. */
  min: number | null;
  max: number | null;
  step: number;
  /** Shown after the score, e.g. "/ 340". */
  suffix: string;
}

export const TESTS: TestKind[] = [
  { key: "gre", label: "GRE General", min: 260, max: 340, step: 1, suffix: "/ 340" },
  // GMAT Focus runs 205 to 805; the classic exam, still valid for five years, ran 200 to 800.
  { key: "gmat", label: "GMAT", min: 200, max: 805, step: 5, suffix: "" },
  { key: "toefl", label: "TOEFL iBT", min: 0, max: 120, step: 1, suffix: "/ 120" },
  { key: "ielts", label: "IELTS Academic", min: 0, max: 9, step: 0.5, suffix: "/ 9" },
  { key: "duolingo", label: "Duolingo English Test", min: 10, max: 160, step: 5, suffix: "/ 160" },
  { key: "pte", label: "PTE Academic", min: 10, max: 90, step: 1, suffix: "/ 90" },
  { key: "sat", label: "SAT", min: 400, max: 1600, step: 10, suffix: "/ 1600" },
  { key: "act", label: "ACT", min: 1, max: 36, step: 1, suffix: "/ 36" },
  { key: "gate", label: "GATE", min: 0, max: 1000, step: 1, suffix: "/ 1000" },
  { key: "cat", label: "CAT (percentile)", min: 0, max: 100, step: 0, suffix: " percentile" },
  { key: "other", label: "Other test", min: null, max: null, step: 0, suffix: "" },
];

export const TEST_BY_KEY = new Map(TESTS.map((t) => [t.key, t]));

/** An error message for an impossible score, or null when it is fine. */
export function scoreProblem(kind: TestKind, score: string): string | null {
  const v = score.trim();
  if (!v) return "Enter your score.";
  if (v.length > 40) return "Keep the score under 40 characters.";
  if (kind.min === null || kind.max === null) return null;
  const n = Number(v);
  if (!/^\d+(\.\d+)?$/.test(v) || !Number.isFinite(n)) return `${kind.label} scores are numbers.`;
  if (n < kind.min || n > kind.max) return `${kind.label} scores run from ${kind.min} to ${kind.max}.`;
  const steps = kind.step ? (n - kind.min) / kind.step : 0;
  if (Math.abs(steps - Math.round(steps)) > 1e-6) return `${kind.label} scores go up in steps of ${kind.step}.`;
  return null;
}

export const CODING_SITE_LABEL = { leetcode: "LeetCode", codeforces: "Codeforces" } as const;

type ScoreLike = {
  kind: string;
  stats: Partial<{
    solved: number; easy: number; medium: number; hard: number; contestRating: number | null; contestsAttended: number; topPercent: number | null;
    rating: number | null; maxRating: number | null; rank: string | null; maxRank: string | null; contests: number;
  }>;
  test_key?: string | null;
  score?: string | null;
  taken_on?: string | null;
};

const n = (v: number) => v.toLocaleString("en-US");
const title = (v: string) => v.replace(/\b\w/g, (c) => c.toUpperCase());
const plural = (count: number, word: string) => `${n(count)} ${word}${count === 1 ? "" : "s"}`;

/** Up to two short lines describing a verified coding profile or a test score. */
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

/** "334 / 340" or "99.2 percentile". */
export function testScoreText(r: ScoreLike): string {
  const kind = r.test_key ? TEST_BY_KEY.get(r.test_key) : undefined;
  return `${r.score ?? ""}${kind?.suffix ? (kind.suffix.startsWith(" ") ? kind.suffix : ` ${kind.suffix}`) : ""}`;
}

/** "Mar 2025" from "2025-03-14", without any time zone shifting the day. */
export function takenOnText(d: string | null | undefined): string | null {
  const m = d?.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, 15)).toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
}
