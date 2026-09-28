"use client";

import { rpc, api } from "./api-client";
import type { EngagementCounts } from "./engagement";

/* ============================================================
   GradLink event-platform data access layer.

   Every function keeps the name, arguments and return shape it had
   on Firestore, so no component changed in the move to Neon. Each
   one is now a call to the Worker (/api/rpc → lib/server/rpc.ts),
   which runs the query against Neon Postgres and enforces the same
   ownership rules firestore.rules did.

   Row field names are the Postgres column names (snake_case) and
   timestamps arrive as ISO strings.

   Every function is resilient: on error it logs and returns a safe
   empty value so the UI can show loading/empty/error states.
   ============================================================ */

export interface AIFeedback {
  strengths?: string[];
  improvements?: string[];
  summary?: string;
}

export interface StudentRow {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  university: string | null;
  degree: string | null;
  graduation_year: number | null;
  skills: string[] | null;
  resume_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  bio: string | null;
  resume_score: number | null;
  ai_feedback: AIFeedback | string | null;
  career_goal?: string | null;
  target_roles?: string[] | null;
  projects?: StudentProject[] | null;
}

export interface StudentProject {
  title: string;
  url?: string;
  description?: string;
}

export interface CompanyRow {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  company: string | null;
  company_name: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  hiring_roles: string[] | null;
  booth_number: string | null;
  skills_wanted: string[] | null;
  brochure_url: string | null;
}

export interface ScanRow {
  id: string;
  created_at: string;
  event_id: string | null;
  scanner_profile_id: string | null;
  scanned_profile_id: string | null;
  scanner_role: string | null;
  scanned_role: string | null;
  scan_context: string | null;
  notes: string | null;
}

export interface ShortlistRow {
  id: string;
  created_at: string;
  event_id: string | null;
  company_id: string | null;
  student_id: string | null;
  status: "shortlisted" | "maybe" | "rejected" | "priority";
  notes: string | null;
}

export interface MessageRow {
  id: string;
  created_at: string;
  event_id: string | null;
  sender_profile_id: string | null;
  receiver_profile_id: string | null;
  message: string;
  read_at: string | null;
}

export interface AnalyticsRow {
  id: string;
  event_id: string | null;
  student_id: string | null;
  profile_views: number;
  company_scans: number;
  shortlists: number;
  messages_received: number;
  resume_score: number;
  engagement_score: number;
}

export interface ChecklistItemRow {
  id: string;
  event_id: string | null;
  role: string;
  title: string;
  description: string | null;
  phase: "pre_event" | "during_event" | "post_event";
  order_index: number;
}

export interface ChecklistProgressRow {
  id: string;
  checklist_item_id: string;
  profile_id: string;
  completed: boolean;
  completed_at: string | null;
}

export type SessionKind = "workshop" | "mock_interview" | "company_session" | "recruiter_slot" | "networking" | "talk";
export type BookingStatus = "booked" | "waitlisted" | "attended" | "cancelled";

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  workshop: "Workshop",
  mock_interview: "Mock interview",
  company_session: "Company session",
  recruiter_slot: "1:1 recruiter slot",
  networking: "Networking",
  talk: "Talk",
};

export interface SessionRow {
  id: string;
  created_at: string;
  event_id: string;
  host_profile_id: string | null;
  kind: SessionKind;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  host_name: string | null;
  host_org: string | null;
  host_role: string | null;
  booked_count: number;
  waitlist_count: number;
  /** The signed-in user's booking, if any (never "cancelled"). */
  my_status: BookingStatus | null;
  my_waitlist_position: number | null;
}

export interface SessionBookingRow {
  profile_id: string;
  status: BookingStatus;
  created_at: string;
  full_name: string;
  university: string | null;
  degree: string | null;
}

export interface SavedCompanyRow {
  student_id: string;
  event_id: string;
  company_id: string;
  saved: boolean;
  interested: boolean;
  visited: boolean;
  follow_up: boolean;
  note: string | null;
  updated_at: string;
}

export type ApplicationStatus = "applied" | "interviewing" | "offer" | "accepted" | "rejected" | "withdrawn";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export interface ApplicationRow {
  id: string;
  created_at: string;
  updated_at: string;
  student_id: string;
  event_id: string | null;
  company_id: string | null;
  company_name: string;
  role_title: string;
  status: ApplicationStatus;
  interview_at: string | null;
  notes: string | null;
}

export interface StudentInsights {
  total: number;
  leaderboard: { rank: number; name: string; score: number; isMe: boolean }[];
  me: { rank: number; score: number; counts: EngagementCounts } | null;
}

type Result<K extends string, T> = { ok: true } & { [key in K]: T } | { ok: false; error: string };

function log(scope: string, error: unknown) {
  if (error) console.warn(`[gradlink/db] ${scope}:`, error);
}

/** Run an op, logging and falling back to `fallback` on any failure. */
async function safe<T>(scope: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return (await run()) ?? fallback;
  } catch (e) {
    log(scope, e);
    return fallback;
  }
}

/* ---------------- Students ---------------- */
export function getStudentByProfile(profileId: string): Promise<StudentRow | null> {
  if (!profileId) return Promise.resolve(null);
  return safe("getStudentByProfile", null, () => rpc<StudentRow | null>("getStudentByProfile", profileId));
}

export function updateStudentProfile(profileId: string, fields: Partial<StudentRow>): Promise<boolean> {
  if (!profileId) return Promise.resolve(false);
  return safe("updateStudentProfile", false, () => rpc<boolean>("updateStudentProfile", profileId, fields));
}

export function getRegisteredStudents(eventId: string): Promise<StudentRow[]> {
  return safe("getRegisteredStudents", [], () => rpc<StudentRow[]>("getRegisteredStudents", eventId));
}

/* ---------------- Companies ---------------- */
export function getCompanyByProfile(profileId: string): Promise<CompanyRow | null> {
  if (!profileId) return Promise.resolve(null);
  return safe("getCompanyByProfile", null, () => rpc<CompanyRow | null>("getCompanyByProfile", profileId));
}

export function updateCompanyProfile(profileId: string, fields: Partial<CompanyRow>): Promise<boolean> {
  if (!profileId) return Promise.resolve(false);
  return safe("updateCompanyProfile", false, () => rpc<boolean>("updateCompanyProfile", profileId, fields));
}

export function getRegisteredCompanies(eventId: string): Promise<CompanyRow[]> {
  return safe("getRegisteredCompanies", [], () => rpc<CompanyRow[]>("getRegisteredCompanies", eventId));
}

/* ---------------- Analytics ---------------- */
export function getAnalytics(studentId: string, eventId: string): Promise<AnalyticsRow | null> {
  if (!studentId) return Promise.resolve(null);
  return safe("getAnalytics", null, () => rpc<AnalyticsRow | null>("getAnalytics", studentId, eventId));
}

export function listAnalytics(eventId: string): Promise<AnalyticsRow[]> {
  return safe("listAnalytics", [], () => rpc<AnalyticsRow[]>("listAnalytics", eventId));
}

/* ---------------- Scans ---------------- */
export function recordScan(input: {
  eventId: string;
  scannerProfileId: string;
  scannedProfileId: string;
  scannerRole: string;
  scannedRole: string;
  scanContext?: string;
  notes?: string;
}): Promise<boolean> {
  return safe("recordScan", false, () => rpc<boolean>("recordScan", input));
}

export function getScans(filter: {
  eventId: string;
  scannerProfileId?: string;
  scannedProfileId?: string;
}): Promise<ScanRow[]> {
  return safe("getScans", [], () => rpc<ScanRow[]>("getScans", filter));
}

/* ---------------- Shortlists ---------------- */
export function upsertShortlist(input: {
  eventId: string;
  companyId: string;
  studentId: string;
  status: ShortlistRow["status"];
  notes?: string | null;
}): Promise<boolean> {
  return safe("upsertShortlist", false, () => rpc<boolean>("upsertShortlist", input));
}

export function getShortlist(companyId: string, studentId: string, eventId: string): Promise<ShortlistRow | null> {
  return safe("getShortlist", null, () => rpc<ShortlistRow | null>("getShortlist", companyId, studentId, eventId));
}

export function listShortlistsForCompany(companyId: string, eventId: string): Promise<ShortlistRow[]> {
  return safe("listShortlistsForCompany", [], () => rpc<ShortlistRow[]>("listShortlistsForCompany", companyId, eventId));
}

export function listShortlistsForStudent(studentId: string, eventId: string): Promise<ShortlistRow[]> {
  return safe("listShortlistsForStudent", [], () => rpc<ShortlistRow[]>("listShortlistsForStudent", studentId, eventId));
}

export function listShortlists(eventId: string): Promise<ShortlistRow[]> {
  return safe("listShortlists", [], () => rpc<ShortlistRow[]>("listShortlists", eventId));
}

/* ---------------- Messages ---------------- */
export function sendMessage(input: {
  eventId: string;
  senderProfileId: string;
  receiverProfileId: string;
  message: string;
}): Promise<boolean> {
  return safe("sendMessage", false, () => rpc<boolean>("sendMessage", input));
}

/** Send one follow-up to several scanned or shortlisted candidates (companies only). */
export function sendBulkMessage(eventId: string, studentIds: string[], message: string): Promise<{ ok: true; sent: number; skipped: number } | { ok: false; error: string }> {
  return safe("sendBulkMessage", { ok: false, error: "Couldn't send. Please try again." }, () => rpc("sendBulkMessage", eventId, studentIds, message));
}

export function listMessagesForProfile(profileId: string, eventId: string): Promise<MessageRow[]> {
  if (!profileId) return Promise.resolve([]);
  return safe("listMessagesForProfile", [], () => rpc<MessageRow[]>("listMessagesForProfile", profileId, eventId));
}

/** Count messages addressed to this profile that haven't been read yet. */
export function getUnreadMessageCount(profileId: string): Promise<number> {
  if (!profileId) return Promise.resolve(0);
  return safe("getUnreadMessageCount", 0, () => rpc<number>("getUnreadMessageCount", profileId));
}

/**
 * Mark messages addressed to this profile as read.
 * Pass `fromProfileId` to mark only one conversation read; omit to mark all.
 * Returns the number of rows that were newly marked read.
 */
export function markMessagesRead(profileId: string, fromProfileId?: string): Promise<number> {
  if (!profileId) return Promise.resolve(0);
  return safe("markMessagesRead", 0, () => rpc<number>("markMessagesRead", profileId, fromProfileId));
}

/* ---------------- Checklist ---------------- */
export function getChecklistItems(role: string, eventId: string): Promise<ChecklistItemRow[]> {
  return safe("getChecklistItems", [], () => rpc<ChecklistItemRow[]>("getChecklistItems", role, eventId));
}

export function getChecklistProgress(profileId: string): Promise<Record<string, boolean>> {
  if (!profileId) return Promise.resolve({});
  return safe("getChecklistProgress", {}, () => rpc<Record<string, boolean>>("getChecklistProgress", profileId));
}

export function setChecklistProgress(itemId: string, profileId: string, completed: boolean): Promise<boolean> {
  if (!profileId || !itemId) return Promise.resolve(false);
  return safe("setChecklistProgress", false, () => rpc<boolean>("setChecklistProgress", itemId, profileId, completed));
}

/* ---------------- Sessions ---------------- */
export function listSessions(eventId: string): Promise<SessionRow[]> {
  return safe("listSessions", [], () => rpc<SessionRow[]>("listSessions", eventId));
}

export function createSession(input: {
  eventId: string;
  kind: SessionKind;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
}): Promise<Result<"session", SessionRow>> {
  return safe("createSession", { ok: false, error: "Couldn't add the session. Please try again." }, () => rpc("createSession", input));
}

export function deleteSession(sessionId: string): Promise<boolean> {
  return safe("deleteSession", false, () => rpc<boolean>("deleteSession", sessionId));
}

export function bookSession(sessionId: string): Promise<Result<"status", BookingStatus>> {
  return safe("bookSession", { ok: false, error: "Couldn't book that session. Please try again." }, () => rpc("bookSession", sessionId));
}

export function cancelBooking(sessionId: string): Promise<boolean> {
  return safe("cancelBooking", false, () => rpc<boolean>("cancelBooking", sessionId));
}

export function listSessionBookings(sessionId: string): Promise<SessionBookingRow[]> {
  return safe("listSessionBookings", [], () => rpc<SessionBookingRow[]>("listSessionBookings", sessionId));
}

export function markAttendance(sessionId: string, profileId: string, attended: boolean): Promise<boolean> {
  return safe("markAttendance", false, () => rpc<boolean>("markAttendance", sessionId, profileId, attended));
}

/* ---------------- Saved companies ---------------- */
export function listSavedCompanies(eventId: string): Promise<SavedCompanyRow[]> {
  return safe("listSavedCompanies", [], () => rpc<SavedCompanyRow[]>("listSavedCompanies", eventId));
}

export function saveCompany(
  eventId: string,
  companyId: string,
  fields: Partial<Pick<SavedCompanyRow, "saved" | "interested" | "visited" | "follow_up" | "note">>,
): Promise<Result<"saved", SavedCompanyRow>> {
  return safe("saveCompany", { ok: false, error: "Couldn't save that. Please try again." }, () => rpc("saveCompany", eventId, companyId, fields));
}

/* ---------------- Applications ---------------- */
export function listApplications(): Promise<ApplicationRow[]> {
  return safe("listApplications", [], () => rpc<ApplicationRow[]>("listApplications"));
}

export function saveApplication(input: {
  id?: string;
  eventId?: string | null;
  companyId?: string | null;
  companyName: string;
  roleTitle: string;
  status: ApplicationStatus;
  interviewAt?: string | null;
  notes?: string | null;
}): Promise<Result<"application", ApplicationRow>> {
  return safe("saveApplication", { ok: false, error: "Couldn't save the application. Please try again." }, () => rpc("saveApplication", input));
}

export function deleteApplication(id: string): Promise<boolean> {
  return safe("deleteApplication", false, () => rpc<boolean>("deleteApplication", id));
}

/* ---------------- Engagement ---------------- */
export function getStudentEventInsights(eventId: string): Promise<StudentInsights | null> {
  return safe("getStudentEventInsights", null, () => rpc<StudentInsights>("getStudentEventInsights", eventId));
}

/* ---------------- Files ---------------- */

/**
 * Upload a résumé/brochure/logo to Workers KV (via /api/files) and return its
 * URL. Readable by any signed-in user, as with Firebase Storage.
 */
export async function uploadPublicFile(folder: string, profileId: string, file: File): Promise<string | null> {
  if (!profileId) return null;
  try {
    const form = new FormData();
    form.set("folder", folder);
    form.set("file", file);
    const { url } = await api<{ url: string }>("/api/files", form);
    return url;
  } catch (e) {
    log("uploadPublicFile", e);
    return null;
  }
}

/** Resolve display names for a set of profile ids (for messages/scans). */
export function getProfileNames(ids: string[]): Promise<Record<string, { name: string; role: string; org: string }>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return Promise.resolve({});
  return safe("getProfileNames", {}, () => rpc<Record<string, { name: string; role: string; org: string }>>("getProfileNames", unique));
}

/* ---------------- helpers ---------------- */
export function normalizeFeedback(fb: AIFeedback | string | null): AIFeedback | null {
  if (!fb) return null;
  if (typeof fb === "string") {
    try {
      return JSON.parse(fb) as AIFeedback;
    } catch {
      return { summary: fb };
    }
  }
  return fb;
}

/* Events moved to lib/events.ts; re-exported so existing imports keep resolving. */
export type { EventRow } from "./events";
export { getEvent } from "./events";
