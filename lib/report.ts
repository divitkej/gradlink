"use client";

import type { StudentRow, CompanyRow, EventRow, ScanRow, ShortlistRow, AnalyticsRow, InterviewCounts, OfferRow } from "./db";
import { evaluateResume } from "./resume";
import { downloadCsv, slugify } from "./csv";
import { fmtEventDate } from "./format";

/* ============================================================
   Post-event outcome report.

   This is the artifact a placement office puts in front of a dean:
   who attended, who engaged, which employers drew interest, and how
   many students came away shortlisted. It's the paid feature, so the
   numbers must be computed from real activity — never seeded values.
   ============================================================ */

export interface EmployerLine {
  name: string;
  booth: string;
  studentScans: number;
  shortlisted: number;
  rejected: number;
  offers: number;
}

export interface StudentLine {
  name: string;
  email: string;
  degree: string;
  university: string;
  graduationYear: string;
  resumeScore: number;
  companiesMet: number;
  shortlists: number;
  offers: number;
  status: string;
}

/**
 * Event ROI score, out of 10: five parts worth 2 points each. A part earns
 * its points in proportion to how close the event came to the part's target,
 * capped at the target. Rates are shares of registered students, except
 * employers active, which is a share of employers.
 */
export const ROI_PARTS = [
  { key: "engaged", label: "Students engaged", target: 80, about: "met at least one employer" },
  { key: "employers", label: "Employers active", target: 100, about: "scanned, shortlisted or were scanned by a student" },
  { key: "shortlisted", label: "Students shortlisted", target: 30, about: "shortlisted by at least one employer" },
  { key: "interviews", label: "Students invited to interview", target: 15, about: "got at least one interview invite" },
  { key: "offers", label: "Students with an offer", target: 5, about: "got at least one offer" },
] as const;
export const ROI_POINTS_PER_PART = 2;

export interface RoiPart {
  key: (typeof ROI_PARTS)[number]["key"];
  label: string;
  about: string;
  /** The event's rate, 0 to 100. */
  rate: number;
  target: number;
  points: number;
}

export interface RoiScore {
  /** Out of 10, one decimal; null while the event has no registered students. */
  score: number | null;
  parts: RoiPart[];
}

/** The ROI score from each part's rate (0 to 100). */
export function roiScore(rates: Record<RoiPart["key"], number>, hasStudents: boolean): RoiScore {
  const parts = ROI_PARTS.map((p) => {
    const rate = rates[p.key];
    const points = Math.round(Math.min(1, rate / p.target) * ROI_POINTS_PER_PART * 10) / 10;
    return { key: p.key, label: p.label, about: p.about, rate, target: p.target, points };
  });
  // The sum of the points as shown, so the breakdown always adds up to the score.
  const total = parts.reduce((sum, p) => sum + p.points, 0);
  return { score: hasStudents ? Math.round(total * 10) / 10 : null, parts };
}

export interface OutcomeReport {
  eventTitle: string;
  eventDate: string;
  location: string;
  generatedAt: string;

  studentsRegistered: number;
  studentsEngaged: number;
  employers: number;
  totalScans: number;
  shortlists: number;
  uniqueStudentsShortlisted: number;
  /** Interview invites companies sent at the event, not counting withdrawn ones. */
  interviewInvites: number;
  /** Invites where the student picked a time. */
  interviewsBooked: number;
  /** Offers companies recorded at the event. */
  offers: number;
  /** Students with at least one offer. */
  studentsWithOffer: number;

  avgResumeScore: number;
  resumeReady: number;
  withResume: number;

  engagementRate: number;
  shortlistRate: number;
  /** Share of registered students with at least one offer. */
  placementRate: number;
  roi: RoiScore;

  employerTable: EmployerLine[];
  studentTable: StudentLine[];
  topSkills: { skill: string; count: number }[];
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

/** Like pct, unrounded, so the ROI score is not thrown off by rounding small events. */
function rate(n: number, d: number) {
  return d > 0 ? Math.min(100, (n / d) * 100) : 0;
}

/**
 * Build the report from live event data.
 *
 * Résumé scores are recomputed with `evaluateResume` rather than read from the
 * stored analytics rows, which were seeded to zero at signup and never
 * recalculated — using them would report every student as unprepared.
 */
export function buildReport(input: {
  event: EventRow | null;
  students: StudentRow[];
  companies: CompanyRow[];
  scans: ScanRow[];
  shortlists: ShortlistRow[];
  analytics?: AnalyticsRow[];
  interviews?: InterviewCounts;
  offers?: OfferRow[];
}): OutcomeReport {
  const { event, students, companies, scans, shortlists } = input;
  // Only offers to students registered for the event count toward its placement rate.
  const registered = new Set(students.map((s) => s.profile_id));
  const offers = (input.offers ?? []).filter((o) => registered.has(o.student_id));
  const studentsWithOffer = new Set(offers.map((o) => o.student_id)).size;

  const scored = students.map((s) => ({ s, score: evaluateResume(s).score }));
  const withResume = students.filter((s) => Boolean(s.resume_url)).length;
  const avgResumeScore = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + r.score, 0) / scored.length)
    : 0;
  const resumeReady = scored.filter((r) => r.score >= 70).length;

  // A student counts as engaged if they appear in any scan, either direction.
  const engagedIds = new Set<string>();
  scans.forEach((sc) => {
    if (sc.scanner_role === "student" && sc.scanner_profile_id) engagedIds.add(sc.scanner_profile_id);
    if (sc.scanned_role === "student" && sc.scanned_profile_id) engagedIds.add(sc.scanned_profile_id);
  });

  const positive = (s: ShortlistRow) => s.status === "shortlisted" || s.status === "priority";
  const uniqueStudentsShortlisted = new Set(
    shortlists.filter(positive).map((s) => s.student_id).filter(Boolean) as string[]
  ).size;

  const employerTable: EmployerLine[] = companies
    .map((c) => {
      const pid = c.profile_id;
      const studentScans = scans.filter(
        (s) =>
          (s.scanned_profile_id === pid && s.scanner_role === "student") ||
          (s.scanner_profile_id === pid && s.scanned_role === "student")
      ).length;
      const mine = shortlists.filter((s) => s.company_id === pid);
      return {
        name: c.company_name ?? c.company ?? "Unnamed company",
        booth: c.booth_number ?? "",
        studentScans,
        shortlisted: mine.filter(positive).length,
        rejected: mine.filter((s) => s.status === "rejected").length,
        offers: offers.filter((o) => o.company_id === pid).length,
      };
    })
    .sort((a, b) => b.studentScans - a.studentScans || b.shortlisted - a.shortlisted);

  const studentTable: StudentLine[] = scored
    .map(({ s, score }) => {
      const pid = s.profile_id;
      const companiesMet = new Set(
        scans
          .filter(
            (sc) =>
              (sc.scanner_profile_id === pid && sc.scanned_role === "company") ||
              (sc.scanned_profile_id === pid && sc.scanner_role === "company")
          )
          .map((sc) => (sc.scanner_profile_id === pid ? sc.scanned_profile_id : sc.scanner_profile_id))
          .filter(Boolean) as string[]
      ).size;
      const mine = shortlists.filter((sl) => sl.student_id === pid);
      const shortlistCount = mine.filter(positive).length;
      const offerCount = offers.filter((o) => o.student_id === pid).length;
      return {
        name: s.full_name,
        email: s.email ?? "",
        degree: s.degree ?? "",
        university: s.university ?? "",
        graduationYear: s.graduation_year ? String(s.graduation_year) : "",
        resumeScore: score,
        companiesMet,
        shortlists: shortlistCount,
        offers: offerCount,
        status: offerCount > 0 ? "Offer" : shortlistCount > 0 ? "Shortlisted" : companiesMet > 0 ? "Engaged" : "No activity",
      };
    })
    .sort((a, b) => b.offers - a.offers || b.shortlists - a.shortlists || b.companiesMet - a.companiesMet);

  const skillCounts = new Map<string, number>();
  students.forEach((s) => (s.skills ?? []).forEach((k) => {
    const key = k.trim();
    if (key) skillCounts.set(key, (skillCounts.get(key) ?? 0) + 1);
  }));
  const topSkills = Array.from(skillCounts, ([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    eventTitle: event?.title ?? "Career Fair",
    eventDate: fmtEventDate(event?.start_date ?? null, { day: "numeric", month: "long", year: "numeric" }) ?? "Not set",
    location: event?.location ?? "Not set",
    generatedAt: new Date().toLocaleString("en-GB"),

    studentsRegistered: students.length,
    studentsEngaged: engagedIds.size,
    employers: companies.length,
    totalScans: scans.length,
    shortlists: shortlists.filter(positive).length,
    uniqueStudentsShortlisted,
    interviewInvites: input.interviews?.invited ?? 0,
    interviewsBooked: input.interviews?.booked ?? 0,
    offers: offers.length,
    studentsWithOffer,

    avgResumeScore,
    resumeReady,
    withResume,

    engagementRate: pct(engagedIds.size, students.length),
    shortlistRate: pct(uniqueStudentsShortlisted, students.length),
    placementRate: pct(studentsWithOffer, students.length),
    roi: roiScore({
      engaged: rate(engagedIds.size, students.length),
      employers: rate(employerTable.filter((e) => e.studentScans + e.shortlisted + e.rejected + e.offers > 0).length, companies.length),
      shortlisted: rate(uniqueStudentsShortlisted, students.length),
      interviews: rate(input.interviews?.students ?? 0, students.length),
      offers: rate(studentsWithOffer, students.length),
    }, students.length > 0),

    employerTable,
    studentTable,
    topSkills,
  };
}

/* ---------------- CSV export ---------------- */

/** The rows of one CSV containing the summary, the employer table and the student table. */
function reportBlocks(r: OutcomeReport): unknown[][] {
  const blocks: unknown[][] = [
    ["GradLink: post-event outcome report"],
    ["Event", r.eventTitle],
    ["Date", r.eventDate],
    ["Location", r.location],
    ["Generated", r.generatedAt],
    [],
    ["Summary"],
    ["Students registered", r.studentsRegistered],
    ["Students engaged", r.studentsEngaged],
    ["Engagement rate (%)", r.engagementRate],
    ["Employers", r.employers],
    ["Total scans", r.totalScans],
    ["Shortlists", r.shortlists],
    ["Students shortlisted", r.uniqueStudentsShortlisted],
    ["Shortlist rate (%)", r.shortlistRate],
    ["Interview invites", r.interviewInvites],
    ["Interviews booked", r.interviewsBooked],
    ["Offers", r.offers],
    ["Students with an offer", r.studentsWithOffer],
    ["Placement rate (%)", r.placementRate],
    ["Event ROI score (out of 10)", r.roi.score ?? ""],
    ["Average resume score", r.avgResumeScore],
    ["Resume-ready (70+)", r.resumeReady],
    ["Students with a resume", r.withResume],
    [],
    ["Employer engagement"],
    ["Company", "Booth", "Student scans", "Shortlisted", "Not a fit", "Offers"],
    ...r.employerTable.map((e) => [e.name, e.booth, e.studentScans, e.shortlisted, e.rejected, e.offers]),
    [],
    ["Students"],
    ["Name", "Email", "Degree", "University", "Grad year", "Resume score", "Companies met", "Shortlists", "Offers", "Status"],
    ...r.studentTable.map((s) => [
      s.name, s.email, s.degree, s.university, s.graduationYear, s.resumeScore, s.companiesMet, s.shortlists, s.offers, s.status,
    ]),
  ];

  blocks.push(
    [],
    ["Event ROI score", r.roi.score ?? "Not enough data"],
    ["Part", "This event (%)", "Target (%)", `Points (of ${ROI_POINTS_PER_PART})`],
    ...r.roi.parts.map((p) => [p.label, Math.round(p.rate), p.target, p.points]),
  );

  if (r.topSkills.length) {
    blocks.push([], ["Top skills"], ["Skill", "Students"], ...r.topSkills.map((s) => [s.skill, s.count]));
  }
  return blocks;
}

/** Trigger a browser download of the report as CSV. */
export function downloadReportCsv(r: OutcomeReport) {
  downloadCsv(`gradlink-outcome-report-${slugify(r.eventTitle) || "event"}.csv`, reportBlocks(r));
}
