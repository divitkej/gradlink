"use client";

import {
  collection, collectionGroup, doc, documentId, getDoc, getDocs, query, where,
  orderBy, setDoc, updateDoc, deleteField, writeBatch, limit as fsLimit,
  type Firestore, type QueryConstraint,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, firebaseStorage } from "./firebase";

/* ============================================================
   GradLink event-platform data access layer (Firestore).

   Document field names deliberately match the previous Postgres
   column names (snake_case) so every consuming component keeps
   working unchanged. Timestamps are ISO strings, not Firestore
   Timestamps, for the same reason.

   Firestore layout:
     profiles/{profileId}
     students/{profileId}          companies/{profileId}   colleges/{profileId}
     events/{eventId}
       └ registrations/{profileId}   scans/{scanId}
         shortlists/{companyId__studentId}   analytics/{studentId}
     messages/{messageId}          (participants[] enables the sender-or-receiver query)
     checklist_items/{itemId}      checklist_progress/{profileId__itemId}
     orders/{orderId}

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

function log(scope: string, error: unknown) {
  if (error) console.warn(`[gradlink/db] ${scope}:`, error);
}

/* ---------------- internal helpers ---------------- */

type Doc = Record<string, unknown>;

/** Shape a Firestore snapshot into a row object with its id. */
function row<T>(id: string, data: Doc | undefined): T {
  return { ...(data ?? {}), id } as T;
}

/** Firestore rejects `undefined`; drop those keys and map null-clears to deleteField(). */
function clean(fields: Doc): Doc {
  const out: Doc = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** `where(documentId(), 'in', …)` caps at 30 values, so page through in chunks. */
function chunk<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Fetch many docs from one collection by id, batched to respect the `in` limit. */
async function getManyById<T>(db: Firestore, path: string, ids: string[]): Promise<T[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return [];
  const results: T[] = [];
  for (const part of chunk(unique)) {
    const snap = await getDocs(query(collection(db, path), where(documentId(), "in", part)));
    snap.forEach((d) => results.push(row<T>(d.id, d.data())));
  }
  return results;
}

const regsCol = (db: Firestore, eventId: string) => collection(db, "events", eventId, "registrations");
const scansCol = (db: Firestore, eventId: string) => collection(db, "events", eventId, "scans");
const shortlistsCol = (db: Firestore, eventId: string) => collection(db, "events", eventId, "shortlists");
const analyticsCol = (db: Firestore, eventId: string) => collection(db, "events", eventId, "analytics");

/** Deterministic composite ids stand in for the old unique constraints. */
const shortlistId = (companyId: string, studentId: string) => `${companyId}__${studentId}`;
const progressId = (profileId: string, itemId: string) => `${profileId}__${itemId}`;

/* ---------------- Students ---------------- */
export async function getStudentByProfile(profileId: string): Promise<StudentRow | null> {
  const db = firestore();
  if (!db || !profileId) return null;
  try {
    const snap = await getDoc(doc(db, "students", profileId));
    return snap.exists() ? row<StudentRow>(snap.id, snap.data()) : null;
  } catch (e) {
    log("getStudentByProfile", e);
    return null;
  }
}

export async function updateStudentProfile(profileId: string, fields: Partial<StudentRow>): Promise<boolean> {
  const db = firestore();
  if (!db || !profileId) return false;
  try {
    await setDoc(doc(db, "students", profileId), clean(fields as Doc), { merge: true });
    return true;
  } catch (e) {
    log("updateStudentProfile", e);
    return false;
  }
}

export async function getRegisteredStudents(eventId: string): Promise<StudentRow[]> {
  const db = firestore();
  if (!db) return [];
  try {
    const regs = await getDocs(query(regsCol(db, eventId), where("role", "==", "student")));
    return await getManyById<StudentRow>(db, "students", regs.docs.map((d) => d.id));
  } catch (e) {
    log("getRegisteredStudents", e);
    return [];
  }
}

/* ---------------- Companies ---------------- */
export async function getCompanyByProfile(profileId: string): Promise<CompanyRow | null> {
  const db = firestore();
  if (!db || !profileId) return null;
  try {
    const snap = await getDoc(doc(db, "companies", profileId));
    return snap.exists() ? row<CompanyRow>(snap.id, snap.data()) : null;
  } catch (e) {
    log("getCompanyByProfile", e);
    return null;
  }
}

export async function updateCompanyProfile(profileId: string, fields: Partial<CompanyRow>): Promise<boolean> {
  const db = firestore();
  if (!db || !profileId) return false;
  try {
    await setDoc(doc(db, "companies", profileId), clean(fields as Doc), { merge: true });
    return true;
  } catch (e) {
    log("updateCompanyProfile", e);
    return false;
  }
}

export async function getRegisteredCompanies(eventId: string): Promise<CompanyRow[]> {
  const db = firestore();
  if (!db) return [];
  try {
    const regs = await getDocs(query(regsCol(db, eventId), where("role", "==", "company")));
    return await getManyById<CompanyRow>(db, "companies", regs.docs.map((d) => d.id));
  } catch (e) {
    log("getRegisteredCompanies", e);
    return [];
  }
}

/* ---------------- Analytics ---------------- */
export async function getAnalytics(studentId: string, eventId: string): Promise<AnalyticsRow | null> {
  const db = firestore();
  if (!db || !studentId) return null;
  try {
    const snap = await getDoc(doc(analyticsCol(db, eventId), studentId));
    return snap.exists() ? row<AnalyticsRow>(snap.id, snap.data()) : null;
  } catch (e) {
    log("getAnalytics", e);
    return null;
  }
}

export async function listAnalytics(eventId: string): Promise<AnalyticsRow[]> {
  const db = firestore();
  if (!db) return [];
  try {
    const snap = await getDocs(analyticsCol(db, eventId));
    return snap.docs.map((d) => row<AnalyticsRow>(d.id, d.data()));
  } catch (e) {
    log("listAnalytics", e);
    return [];
  }
}

/* ---------------- Scans ---------------- */
export async function recordScan(input: {
  eventId: string;
  scannerProfileId: string;
  scannedProfileId: string;
  scannerRole: string;
  scannedRole: string;
  scanContext?: string;
  notes?: string;
}): Promise<boolean> {
  const db = firestore();
  if (!db) return false;
  const eventId = input.eventId;
  try {
    const ref = doc(scansCol(db, eventId));
    await setDoc(ref, {
      created_at: new Date().toISOString(),
      event_id: eventId,
      scanner_profile_id: input.scannerProfileId,
      scanned_profile_id: input.scannedProfileId,
      scanner_role: input.scannerRole,
      scanned_role: input.scannedRole,
      scan_context: input.scanContext ?? "qr",
      notes: input.notes ?? null,
    });
    return true;
  } catch (e) {
    log("recordScan", e);
    return false;
  }
}

export async function getScans(filter: {
  eventId: string;
  scannerProfileId?: string;
  scannedProfileId?: string;
}): Promise<ScanRow[]> {
  const db = firestore();
  if (!db) return [];
  const eventId = filter.eventId;
  try {
    const cons: QueryConstraint[] = [];
    if (filter.scannerProfileId) cons.push(where("scanner_profile_id", "==", filter.scannerProfileId));
    if (filter.scannedProfileId) cons.push(where("scanned_profile_id", "==", filter.scannedProfileId));
    cons.push(orderBy("created_at", "desc"));
    const snap = await getDocs(query(scansCol(db, eventId), ...cons));
    return snap.docs.map((d) => row<ScanRow>(d.id, d.data()));
  } catch (e) {
    log("getScans", e);
    return [];
  }
}

/* ---------------- Shortlists ---------------- */
export async function upsertShortlist(input: {
  eventId: string;
  companyId: string;
  studentId: string;
  status: ShortlistRow["status"];
  notes?: string | null;
}): Promise<boolean> {
  const db = firestore();
  if (!db) return false;
  const eventId = input.eventId;
  try {
    const id = shortlistId(input.companyId, input.studentId);
    const ref = doc(shortlistsCol(db, eventId), id);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      {
        // Preserve the original created_at across status changes.
        created_at: existing.exists() ? (existing.data().created_at as string) : new Date().toISOString(),
        event_id: eventId,
        company_id: input.companyId,
        student_id: input.studentId,
        status: input.status,
        notes: input.notes ?? null,
      },
      { merge: true }
    );
    return true;
  } catch (e) {
    log("upsertShortlist", e);
    return false;
  }
}

export async function getShortlist(companyId: string, studentId: string, eventId: string): Promise<ShortlistRow | null> {
  const db = firestore();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(shortlistsCol(db, eventId), shortlistId(companyId, studentId)));
    return snap.exists() ? row<ShortlistRow>(snap.id, snap.data()) : null;
  } catch (e) {
    log("getShortlist", e);
    return null;
  }
}

export async function listShortlistsForCompany(companyId: string, eventId: string): Promise<ShortlistRow[]> {
  const db = firestore();
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(shortlistsCol(db, eventId), where("company_id", "==", companyId), orderBy("created_at", "desc"))
    );
    return snap.docs.map((d) => row<ShortlistRow>(d.id, d.data()));
  } catch (e) {
    log("listShortlistsForCompany", e);
    return [];
  }
}

export async function listShortlistsForStudent(studentId: string, eventId: string): Promise<ShortlistRow[]> {
  const db = firestore();
  if (!db) return [];
  try {
    const snap = await getDocs(query(shortlistsCol(db, eventId), where("student_id", "==", studentId)));
    return snap.docs.map((d) => row<ShortlistRow>(d.id, d.data()));
  } catch (e) {
    log("listShortlistsForStudent", e);
    return [];
  }
}

export async function listShortlists(eventId: string): Promise<ShortlistRow[]> {
  const db = firestore();
  if (!db) return [];
  try {
    const snap = await getDocs(shortlistsCol(db, eventId));
    return snap.docs.map((d) => row<ShortlistRow>(d.id, d.data()));
  } catch (e) {
    log("listShortlists", e);
    return [];
  }
}

/* ---------------- Messages ---------------- */
export async function sendMessage(input: {
  eventId: string;
  senderProfileId: string;
  receiverProfileId: string;
  message: string;
}): Promise<boolean> {
  const db = firestore();
  if (!db) return false;
  try {
    const ref = doc(collection(db, "messages"));
    await setDoc(ref, {
      created_at: new Date().toISOString(),
      event_id: input.eventId,
      sender_profile_id: input.senderProfileId,
      receiver_profile_id: input.receiverProfileId,
      // Firestore can't OR across two fields, so both sides are indexed here.
      participants: [input.senderProfileId, input.receiverProfileId],
      message: input.message,
      read_at: null,
    });
    return true;
  } catch (e) {
    log("sendMessage", e);
    return false;
  }
}

export async function listMessagesForProfile(profileId: string, eventId: string): Promise<MessageRow[]> {
  const db = firestore();
  if (!db || !profileId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "messages"),
        where("participants", "array-contains", profileId),
        where("event_id", "==", eventId),
        orderBy("created_at", "desc")
      )
    );
    return snap.docs.map((d) => row<MessageRow>(d.id, d.data()));
  } catch (e) {
    log("listMessagesForProfile", e);
    return [];
  }
}

/** Count messages addressed to this profile that haven't been read yet. */
export async function getUnreadMessageCount(profileId: string): Promise<number> {
  const db = firestore();
  if (!db || !profileId) return 0;
  try {
    const snap = await getDocs(
      query(
        collection(db, "messages"),
        where("receiver_profile_id", "==", profileId),
        where("read_at", "==", null)
      )
    );
    return snap.size;
  } catch (e) {
    log("getUnreadMessageCount", e);
    return 0;
  }
}

/**
 * Mark messages addressed to this profile as read.
 * Pass `fromProfileId` to mark only one conversation read; omit to mark all.
 * Returns the number of rows that were newly marked read.
 */
export async function markMessagesRead(profileId: string, fromProfileId?: string): Promise<number> {
  const db = firestore();
  if (!db || !profileId) return 0;
  try {
    const cons: QueryConstraint[] = [
      where("receiver_profile_id", "==", profileId),
      where("read_at", "==", null),
    ];
    if (fromProfileId) cons.push(where("sender_profile_id", "==", fromProfileId));
    const snap = await getDocs(query(collection(db, "messages"), ...cons));
    if (snap.empty) return 0;

    const now = new Date().toISOString();
    // writeBatch caps at 500 operations.
    for (const part of chunk(snap.docs, 500)) {
      const batch = writeBatch(db);
      part.forEach((d) => batch.update(d.ref, { read_at: now }));
      await batch.commit();
    }
    return snap.size;
  } catch (e) {
    log("markMessagesRead", e);
    return 0;
  }
}

/* ---------------- Checklist ---------------- */
export async function getChecklistItems(role: string, eventId: string): Promise<ChecklistItemRow[]> {
  const db = firestore();
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "checklist_items"),
        where("event_id", "==", eventId),
        where("role", "==", role),
        orderBy("order_index", "asc")
      )
    );
    return snap.docs.map((d) => row<ChecklistItemRow>(d.id, d.data()));
  } catch (e) {
    log("getChecklistItems", e);
    return [];
  }
}

export async function getChecklistProgress(profileId: string): Promise<Record<string, boolean>> {
  const db = firestore();
  if (!db || !profileId) return {};
  try {
    const snap = await getDocs(
      query(collection(db, "checklist_progress"), where("profile_id", "==", profileId))
    );
    const map: Record<string, boolean> = {};
    snap.forEach((d) => {
      const r = d.data() as { checklist_item_id: string; completed: boolean };
      map[r.checklist_item_id] = r.completed;
    });
    return map;
  } catch (e) {
    log("getChecklistProgress", e);
    return {};
  }
}

export async function setChecklistProgress(itemId: string, profileId: string, completed: boolean): Promise<boolean> {
  const db = firestore();
  if (!db || !profileId || !itemId) return false;
  try {
    await setDoc(
      doc(db, "checklist_progress", progressId(profileId, itemId)),
      {
        checklist_item_id: itemId,
        profile_id: profileId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { merge: true }
    );
    return true;
  } catch (e) {
    log("setChecklistProgress", e);
    return false;
  }
}

/* ---------------- role detection (real sign-in) ---------------- */
import type { AppRole } from "./session";

const ROLE_TABLE_MAP: { table: string; role: AppRole; orgCol: string }[] = [
  { table: "students", role: "student", orgCol: "university" },
  { table: "companies", role: "company", orgCol: "company" },
  { table: "colleges", role: "event_manager", orgCol: "institution" },
];

/**
 * Best-effort: find a signed-in user's role + name + org + profile from their email.
 * Matches on the lowercased `email_lower` field, since Firestore has no
 * case-insensitive comparison (Postgres used ILIKE here).
 */
export async function detectIdentityByEmail(
  email: string
): Promise<{ role: AppRole; name: string; org: string; profileId: string | null } | null> {
  const db = firestore();
  if (!db || !email) return null;
  const e = email.trim().toLowerCase();
  for (const c of ROLE_TABLE_MAP) {
    try {
      const snap = await getDocs(
        query(collection(db, c.table), where("email_lower", "==", e), fsLimit(1))
      );
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as Record<string, string | null>;
        return {
          role: c.role,
          name: (data.full_name as string) ?? "",
          org: (data[c.orgCol] as string) ?? "",
          // Role docs are keyed by profile id, so the doc id IS the profile id.
          profileId: (data.profile_id as string) ?? d.id,
        };
      }
    } catch (err) {
      log(`detectIdentityByEmail.${c.table}`, err);
    }
  }
  return null;
}

/**
 * Ensure a real profile exists for a user (used when an older account has no
 * profile yet). Creates the profile, links the role doc, registers students/
 * companies into the demo event, and returns the new profileId.
 */
export async function ensureProfile(input: { email: string; role: AppRole; name: string; org: string }): Promise<string | null> {
  const db = firestore();
  if (!db) return null;
  const e = input.email.trim().toLowerCase();
  try {
    const profileRef = doc(collection(db, "profiles"));
    const pid = profileRef.id;
    await setDoc(profileRef, {
      created_at: new Date().toISOString(),
      auth_uid: null,
      role: input.role,
      full_name: input.name,
      email: input.email,
      email_lower: e,
      organization: input.org,
      avatar_url: null,
    });

    const entry = ROLE_TABLE_MAP.find((r) => r.role === input.role) ?? ROLE_TABLE_MAP[0];
    await setDoc(
      doc(db, entry.table, pid),
      {
        created_at: new Date().toISOString(),
        profile_id: pid,
        full_name: input.name,
        email: input.email,
        email_lower: e,
        [entry.orgCol]: input.org,
      },
      { merge: true }
    );

    // No event registration here on purpose: a new account isn't a member of
    // anything until they join an event with its code (see lib/events.ts).
    return pid;
  } catch (err) {
    log("ensureProfile", err);
    return null;
  }
}

/** Upload a file to Firebase Storage and return its public download URL. */
export async function uploadPublicFile(folder: string, profileId: string, file: File): Promise<string | null> {
  const storage = firebaseStorage();
  if (!storage) return null;
  try {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${profileId}-${Date.now()}-${safe}`;
    const r = storageRef(storage, path);
    await uploadBytes(r, file, { contentType: file.type || undefined });
    return await getDownloadURL(r);
  } catch (e) {
    log("uploadPublicFile", e);
    return null;
  }
}

/** Resolve display names for a set of profile ids (for messages/scans). */
export async function getProfileNames(ids: string[]): Promise<Record<string, { name: string; role: string; org: string }>> {
  const db = firestore();
  if (!db) return {};
  try {
    const rows = await getManyById<{ id: string; full_name?: string; role?: string; organization?: string | null }>(
      db, "profiles", ids
    );
    const map: Record<string, { name: string; role: string; org: string }> = {};
    rows.forEach((r) => {
      map[r.id] = { name: r.full_name ?? "", role: r.role ?? "", org: r.organization ?? "" };
    });
    return map;
  } catch (e) {
    log("getProfileNames", e);
    return {};
  }
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

/* Re-exported so callers that need a raw handle don't import firebase directly. */
export { firestore, collectionGroup, deleteField, updateDoc };
