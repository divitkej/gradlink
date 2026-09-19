import type { StudentRow } from "./db";

/* ============================================================
   AI Resume Score — modular, deterministic placeholder engine.
   Swap the body of evaluateResume() for a real LLM/API call later;
   the return shape is the stable contract the UI depends on.
   ============================================================ */

export interface ResumeEvaluation {
  score: number; // 0–100
  strengths: string[];
  improvements: string[];
  summary: string;
  breakdown: { label: string; earned: number; max: number }[];
}

const EXPERIENCE_KEYWORDS = [
  "intern", "internship", "led", "managed", "built", "shipped", "launched",
  "project", "team", "increase", "reduced", "improved", "%", "award", "won",
];

export function evaluateResume(student: Partial<StudentRow>): ResumeEvaluation {
  const skills = student.skills ?? [];
  const bio = (student.bio ?? "").toLowerCase();

  // ---- scoring dimensions ----
  const skillsEarned = Math.min(skills.length, 5) * 5; // /25
  const educationEarned =
    (student.degree ? 10 : 0) + (student.graduation_year ? 5 : 0); // /15
  const linksEarned =
    (student.linkedin_url ? 7 : 0) +
    (student.github_url ? 7 : 0) +
    (student.portfolio_url ? 6 : 0); // /20
  const resumeEarned = student.resume_url ? 15 : 0; // /15
  const keywordHits = EXPERIENCE_KEYWORDS.filter((k) => bio.includes(k)).length;
  const bioEarned =
    (bio.length > 0 ? 6 : 0) +
    (bio.length > 120 ? 4 : 0) +
    Math.min(keywordHits, 3) * (5 / 3); // /15
  const baselineEarned = student.full_name && student.email ? 10 : 0; // /10

  const breakdown = [
    { label: "Skills coverage", earned: skillsEarned, max: 25 },
    { label: "Education details", earned: educationEarned, max: 15 },
    { label: "Links & profiles", earned: linksEarned, max: 20 },
    { label: "Resume uploaded", earned: resumeEarned, max: 15 },
    { label: "Bio & impact", earned: Math.round(bioEarned), max: 15 },
    { label: "Profile basics", earned: baselineEarned, max: 10 },
  ];

  // No résumé attached → the AI résumé score is 0 until one is uploaded.
  if (!student.resume_url) {
    const improvements = ["Attach your résumé (PDF) to get your AI score"];
    if (skills.length < 5) improvements.push("List at least 5 relevant skills");
    if (!student.linkedin_url && !student.github_url && !student.portfolio_url)
      improvements.push("Add a LinkedIn, GitHub, or portfolio link");
    if (!student.degree || !student.graduation_year) improvements.push("Add your degree and graduation year");
    if (bio.length < 120) improvements.push("Write a short bio with measurable achievements");
    return {
      score: 0,
      strengths: skills.length ? ["Skills added — great start"] : ["Profile created"],
      improvements,
      summary: "No résumé attached yet — upload your résumé to unlock your AI score.",
      breakdown,
    };
  }

  const score = Math.max(0, Math.min(100, Math.round(breakdown.reduce((s, b) => s + b.earned, 0))));

  // ---- strengths ----
  const strengths: string[] = [];
  if (skills.length >= 5) strengths.push("Strong, well-rounded skill set");
  else if (skills.length >= 3) strengths.push("Solid core skills listed");
  if (student.degree && student.graduation_year) strengths.push("Complete education details");
  if (student.linkedin_url && (student.github_url || student.portfolio_url))
    strengths.push("Professional profiles & work linked");
  if (student.resume_url) strengths.push("Resume uploaded and ready to share");
  if (keywordHits >= 2) strengths.push("Bio shows measurable, action-oriented impact");
  if (!strengths.length) strengths.push("Profile created — good first step");

  // ---- improvements ----
  const improvements: string[] = [];
  if (!student.resume_url) improvements.push("Upload a resume PDF so recruiters can review it");
  if (skills.length < 5) improvements.push("List at least 5 relevant skills");
  if (!student.github_url && !student.portfolio_url)
    improvements.push("Add a GitHub or portfolio link to show your work");
  if (!student.linkedin_url) improvements.push("Add your LinkedIn profile");
  if (!student.graduation_year) improvements.push("Add your graduation year");
  if (bio.length < 120) improvements.push("Expand your bio with measurable achievements");
  if (!improvements.length) improvements.push("Looking great — keep your profile current");

  // ---- summary ----
  let summary: string;
  if (score >= 85) summary = "Excellent, recruiter-ready resume. Minor polish only.";
  else if (score >= 70) summary = "Strong resume that will stand out with a few targeted additions.";
  else if (score >= 50) summary = "A solid base — add the missing sections to be event-ready.";
  else summary = "Early-stage resume. Add core sections and evidence before recruiter outreach.";

  return { score, strengths, improvements, summary, breakdown };
}

export function scoreTone(score: number): string {
  if (score >= 80) return "var(--teal)";
  if (score >= 60) return "var(--cyan)";
  if (score >= 40) return "var(--amber)";
  return "var(--danger)";
}
