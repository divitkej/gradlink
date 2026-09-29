/* ============================================================
   Coding profiles (LeetCode, Codeforces), verified with the site
   itself before anything is shown to employers.

   Neither site lets a user sign in to another app, so ownership is
   proved by doing something only the account holder can do:
     * LeetCode: put a one-time code in the profile's Summary, which
       LeetCode's public GraphQL API returns as `aboutMe`;
     * Codeforces: make a submission that fails to compile to problem
       4A, which its public API lists with the submission time.
   Stats are always read here, never taken from the browser. Only the
   handle is taken from the student, and it is sent as a variable or
   query parameter, never as part of the host or path.
   ============================================================ */

export type CodingSite = "leetcode" | "codeforces";

export interface LeetCodeStats {
  solved: number;
  easy: number;
  medium: number;
  hard: number;
  /** Contest rating, rounded; null if they never entered a rated contest. */
  contestRating: number | null;
  contestsAttended: number;
  /** e.g. 4.2 means top 4.2% of contest participants. */
  topPercent: number | null;
}

export interface CodeforcesStats {
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  contests: number;
}

export interface CodingProfile {
  /** The handle as the site spells it. */
  handle: string;
  stats: LeetCodeStats | CodeforcesStats;
}

export class CodingError extends Error {}

const UA = "Mozilla/5.0 (compatible; GradLink profile check; +https://gradlink.app)";
const DOWN = (site: string) => `${site} didn't respond. Please try again in a minute.`;

/** A LeetCode username from a bare name or a profile link. */
export function leetcodeHandle(input: string): string | null {
  const v = input.trim();
  const m = v.match(/leetcode\.(?:com|cn)\/(?:u\/)?([A-Za-z0-9_-]{1,40})\/?(?:[?#].*)?$/i) ?? v.match(/^@?([A-Za-z0-9_-]{1,40})$/);
  return m && !["problems", "contest", "discuss", "explore"].includes(m[1].toLowerCase()) ? m[1] : null;
}

/** A Codeforces handle from a bare name or a profile link. */
export function codeforcesHandle(input: string): string | null {
  const v = input.trim();
  const m = v.match(/codeforces\.com\/profile\/([A-Za-z0-9_.-]{3,24})\/?(?:[?#].*)?$/i) ?? v.match(/^@?([A-Za-z0-9_.-]{3,24})$/);
  return m ? m[1] : null;
}

async function getJson(site: string, url: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new CodingError(DOWN(site));
  }
  const body = await res.json().catch(() => null);
  if (body === null && res.status !== 404) throw new CodingError(DOWN(site));
  return { status: res.status, body };
}

/* ---------------- LeetCode ---------------- */

const LC_QUERY = `query gradlink($u: String!) {
  matchedUser(username: $u) {
    username
    profile { aboutMe }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
  userContestRanking(username: $u) { rating attendedContestsCount topPercentage }
}`;

type Obj = Record<string, unknown>;

/** The profile and its Summary text, or null if LeetCode has no such user. */
export async function fetchLeetCode(handle: string): Promise<(CodingProfile & { about: string }) | null> {
  const { status, body } = await getJson("LeetCode", "https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/" },
    body: JSON.stringify({ query: LC_QUERY, variables: { u: handle } }),
  });
  const data = (body as { data?: Obj } | null)?.data;
  if (!data) throw new CodingError(DOWN("LeetCode"));
  const user = data.matchedUser as Obj | null;
  if (!user) {
    if (status >= 500) throw new CodingError(DOWN("LeetCode"));
    return null;
  }
  const counts = new Map(
    (((user.submitStatsGlobal as Obj | null)?.acSubmissionNum as Obj[] | undefined) ?? [])
      .map((r) => [String(r.difficulty), Number(r.count) || 0]),
  );
  const contest = data.userContestRanking as Obj | null;
  const attended = Number(contest?.attendedContestsCount) || 0;
  const rating = Number(contest?.rating);
  const top = Number(contest?.topPercentage);
  return {
    handle: String(user.username ?? handle),
    about: String((user.profile as Obj | null)?.aboutMe ?? ""),
    stats: {
      solved: counts.get("All") ?? 0,
      easy: counts.get("Easy") ?? 0,
      medium: counts.get("Medium") ?? 0,
      hard: counts.get("Hard") ?? 0,
      contestRating: attended > 0 && Number.isFinite(rating) ? Math.round(rating) : null,
      contestsAttended: attended,
      topPercent: attended > 0 && Number.isFinite(top) && top > 0 ? top : null,
    },
  };
}

/* ---------------- Codeforces ---------------- */

/** The problem a verification submission goes to: 4A, "Watermelon". */
export const CF_VERIFY_PROBLEM = { contestId: 4, index: "A", url: "https://codeforces.com/problemset/problem/4/A" };

async function codeforces(method: string, params: Record<string, string>): Promise<unknown[] | null> {
  const { body } = await getJson("Codeforces", `https://codeforces.com/api/${method}?${new URLSearchParams(params)}`);
  const b = body as { status?: string; result?: unknown; comment?: string } | null;
  if (b?.status === "OK" && Array.isArray(b.result)) return b.result;
  // Codeforces answers an unknown handle with FAILED and a comment naming it.
  if (b?.status === "FAILED" && /not found/i.test(b.comment ?? "")) return null;
  throw new CodingError(DOWN("Codeforces"));
}

export async function fetchCodeforces(handle: string): Promise<CodingProfile | null> {
  const info = await codeforces("user.info", { handles: handle });
  const u = info?.[0] as Obj | undefined;
  if (!u) return null;
  const history = await codeforces("user.rating", { handle: String(u.handle ?? handle) }).catch(() => []);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    handle: String(u.handle ?? handle),
    stats: { rating: num(u.rating), maxRating: num(u.maxRating), rank: str(u.rank), maxRank: str(u.maxRank), contests: history?.length ?? 0 },
  };
}

/** Did this handle submit code that failed to compile to 4A at or after `since`? */
export async function codeforcesVerified(handle: string, since: Date): Promise<boolean> {
  const subs = (await codeforces("user.status", { handle, from: "1", count: "20" })) ?? [];
  const after = Math.floor(since.getTime() / 1000) - 60;
  return subs.some((x) => {
    const s = x as Obj, p = (s.problem ?? {}) as Obj;
    return p.contestId === CF_VERIFY_PROBLEM.contestId && p.index === CF_VERIFY_PROBLEM.index
      && s.verdict === "COMPILATION_ERROR" && Number(s.creationTimeSeconds) >= after;
  });
}
