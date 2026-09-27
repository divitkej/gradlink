import type { NeonQueryFunction } from "@neondatabase/serverless";

/* ============================================================
   The checklist every new event starts with, one list per role.

   Seeded into checklist_items when an event is created (and, for
   events created before seeding existed, the first time anyone in
   the event opens a checklist). Titles matter: Checklist.tsx
   auto-ticks some items by matching words in the title, so keep
   the student and company titles in step with autoRule and
   companyAutoRule there.
   ============================================================ */

type Phase = "pre_event" | "during_event" | "post_event";
type Item = [role: "student" | "company" | "event_manager", phase: Phase, title: string, description: string];

const ITEMS: Item[] = [
  ["student", "pre_event", "Complete your profile", "Fill in degree, graduation year, skills and a short bio."],
  ["student", "pre_event", "Upload your resume", "Add a PDF so companies can review and download it."],
  ["student", "pre_event", "Check your resume score", "Open the resume analysis and act on the suggestions."],
  ["student", "pre_event", "Add portfolio / LinkedIn / GitHub", "Link your work so recruiters can go deeper."],
  ["student", "pre_event", "Save target companies", "Browse registered companies and save the ones you want to meet."],
  ["student", "pre_event", "Prepare your elevator pitch", "A 30-second intro you can give at any booth."],
  ["student", "during_event", "Show your QR to companies", "Let recruiters scan you to share your profile instantly."],
  ["student", "during_event", "Scan companies of interest", "Scan booth QR codes to save companies and open roles."],
  ["student", "during_event", "Visit your saved companies", "Work through your saved list booth by booth."],
  ["student", "during_event", "Send messages / follow-ups", "Reach out to recruiters you connected with."],
  ["student", "during_event", "Mark booth visits", "Track which booths you have already visited."],
  ["student", "post_event", "Review companies you scanned", "Revisit the companies and roles you captured."],
  ["student", "post_event", "Message shortlisted companies", "Follow up with companies that shortlisted you."],
  ["student", "post_event", "Send follow-up notes", "Thank recruiters and reinforce your interest."],
  ["student", "post_event", "Track responses", "Keep an eye on replies and next steps."],

  ["company", "pre_event", "Complete company profile", "Add sector, description, website and logo."],
  ["company", "pre_event", "Add hiring roles", "List the roles you are recruiting for at the event."],
  ["company", "pre_event", "Review registered students", "Browse the talent pool before the event."],
  ["company", "pre_event", "Pre-shortlist candidates", "Flag priority candidates to visit your booth."],
  ["company", "pre_event", "Prepare booth instructions", "Brief your team on the scan-and-shortlist flow."],
  ["company", "during_event", "Scan student QR codes", "Capture each student you meet at the booth."],
  ["company", "during_event", "Shortlist candidates", "Mark students as priority, shortlisted or maybe."],
  ["company", "during_event", "Add notes", "Record context for each candidate while it is fresh."],
  ["company", "during_event", "Message strong candidates", "Reach out to your best matches during the event."],
  ["company", "post_event", "Review your shortlist", "Go through the candidates you flagged with your team."],
  ["company", "post_event", "Send follow-up messages", "Keep momentum with shortlisted students."],
  ["company", "post_event", "Move candidates to your hiring process", "Hand your shortlist to the people running interviews."],

  ["event_manager", "pre_event", "Confirm attending employers", "Check the employers registered for the event."],
  ["event_manager", "pre_event", "Monitor student registrations", "Track sign-ups and check-in readiness."],
  ["event_manager", "pre_event", "Review readiness", "Check resume readiness across registered students."],
  ["event_manager", "pre_event", "Confirm QR setup", "Ensure every booth and student has a working QR."],
  ["event_manager", "during_event", "Monitor live scans", "Watch scan and engagement activity as it happens."],
  ["event_manager", "during_event", "Help inactive students", "Reach out to students with low or no engagement."],
  ["event_manager", "during_event", "Track booth engagement", "See which employers are drawing the most interest."],
  ["event_manager", "post_event", "Generate report", "Compile the post-event outcome report."],
  ["event_manager", "post_event", "Review outcomes", "Assess shortlists and follow-up completion."],
];

/** Order within a role and phase, starting at 1, as the imported library did. */
function withOrder() {
  const seen = new Map<string, number>();
  return ITEMS.map(([role, phase, title, description]) => {
    const key = `${role}/${phase}`;
    const order = (seen.get(key) ?? 0) + 1;
    seen.set(key, order);
    return { role, phase, title, description, order };
  });
}

const ROWS = withOrder();

/**
 * One INSERT that adds the default checklist to an event, but only while the
 * event has no checklist items at all. Safe to run more than once; callers
 * that can race (lazy backfill) must hold a lock on the event first.
 */
export function seedChecklistQuery(sql: NeonQueryFunction<false, false>, eventId: string) {
  return sql`
    insert into checklist_items (event_id, role, title, description, phase, order_index)
    select ${eventId}, d.role, d.title, d.description, d.phase, d.order_index
    from unnest(
      ${ROWS.map((r) => r.role)}::text[], ${ROWS.map((r) => r.title)}::text[], ${ROWS.map((r) => r.description)}::text[],
      ${ROWS.map((r) => r.phase)}::text[], ${ROWS.map((r) => r.order)}::int[]
    ) as d(role, title, description, phase, order_index)
    where not exists (select 1 from checklist_items where event_id = ${eventId})
  `;
}
