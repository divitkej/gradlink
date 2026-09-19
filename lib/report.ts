"use client";

import type { StudentRow, CompanyRow, EventRow, ScanRow, ShortlistRow, AnalyticsRow } from "./db";
import { evaluateResume } from "./resume";

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
  status: string;
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

  avgResumeScore: number;
  resumeReady: number;
  withResume: number;

  engagementRate: number;
  shortlistRate: number;

  employerTable: EmployerLine[];
  studentTable: StudentLine[];
  topSkills: { skill: string; count: number }[];
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
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
}): OutcomeReport {
  const { event, students, companies, scans, shortlists } = input;

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
        name: c.company_name ?? c.company ?? "—",
        booth: c.booth_number ?? "—",
        studentScans,
        shortlisted: mine.filter(positive).length,
        rejected: mine.filter((s) => s.status === "rejected").length,
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
      return {
        name: s.full_name,
        email: s.email,
        degree: s.degree ?? "—",
        university: s.university ?? "—",
        graduationYear: s.graduation_year ? String(s.graduation_year) : "—",
        resumeScore: score,
        companiesMet,
        shortlists: shortlistCount,
        status: shortlistCount > 0 ? "Shortlisted" : companiesMet > 0 ? "Engaged" : "No activity",
      };
    })
    .sort((a, b) => b.shortlists - a.shortlists || b.companiesMet - a.companiesMet);

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
    eventDate: event?.start_date ? new Date(event.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—",
    location: event?.location ?? "—",
    generatedAt: new Date().toLocaleString("en-GB"),

    studentsRegistered: students.length,
    studentsEngaged: engagedIds.size,
    employers: companies.length,
    totalScans: scans.length,
    shortlists: shortlists.filter(positive).length,
    uniqueStudentsShortlisted,

    avgResumeScore,
    resumeReady,
    withResume,

    engagementRate: pct(engagedIds.size, students.length),
    shortlistRate: pct(uniqueStudentsShortlisted, students.length),

    employerTable,
    studentTable,
    topSkills,
  };
}

/* ---------------- CSV export ---------------- */

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRows(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** One CSV containing the summary, the employer table and the student table. */
export function reportToCsv(r: OutcomeReport): string {
  const blocks: unknown[][] = [
    ["GradLink — Post-event outcome report"],
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
    ["Average resume score", r.avgResumeScore],
    ["Resume-ready (70+)", r.resumeReady],
    ["Students with a resume", r.withResume],
    [],
    ["Employer engagement"],
    ["Company", "Booth", "Student scans", "Shortlisted", "Not a fit"],
    ...r.employerTable.map((e) => [e.name, e.booth, e.studentScans, e.shortlisted, e.rejected]),
    [],
    ["Students"],
    ["Name", "Email", "Degree", "University", "Grad year", "Resume score", "Companies met", "Shortlists", "Status"],
    ...r.studentTable.map((s) => [
      s.name, s.email, s.degree, s.university, s.graduationYear, s.resumeScore, s.companiesMet, s.shortlists, s.status,
    ]),
  ];

  if (r.topSkills.length) {
    blocks.push([], ["Top skills"], ["Skill", "Students"], ...r.topSkills.map((s) => [s.skill, s.count]));
  }
  return csvRows(blocks);
}

/** Trigger a browser download of the report as CSV. */
export function downloadReportCsv(r: OutcomeReport) {
  // The BOM makes Excel open UTF-8 correctly instead of mangling accents.
  const blob = new Blob(["﻿" + reportToCsv(r)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = r.eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  a.href = url;
  a.download = `gradlink-outcome-report-${slug || "event"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
