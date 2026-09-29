/**
 * The checklist every new event starts with, per role and phase. Titles
 * matter: components/dashboard/Checklist.tsx ticks some items automatically
 * by matching words in the title (for example "upload your resume").
 */
export interface ChecklistTemplateItem {
  role: "student" | "company" | "event_manager";
  phase: "pre_event" | "during_event" | "post_event";
  order_index: number;
  title: string;
  description: string;
}

export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  { role: "student", phase: "pre_event", order_index: 1, title: "Complete your profile", description: "Fill in degree, graduation year, skills and a short bio." },
  { role: "student", phase: "pre_event", order_index: 2, title: "Upload your resume", description: "Add a PDF so companies can review and download it." },
  { role: "student", phase: "pre_event", order_index: 3, title: "Check your resume score", description: "See your résumé score and act on the suggestions." },
  { role: "student", phase: "pre_event", order_index: 4, title: "Add portfolio / LinkedIn / GitHub", description: "Link your work so recruiters can go deeper." },
  { role: "student", phase: "pre_event", order_index: 5, title: "Save target companies", description: "Browse registered companies and save the ones you want to meet." },
  { role: "student", phase: "pre_event", order_index: 6, title: "Prepare your elevator pitch", description: "A 30-second intro you can give at any booth." },
  { role: "student", phase: "during_event", order_index: 1, title: "Show your QR to companies", description: "Let recruiters scan you to share your profile instantly." },
  { role: "student", phase: "during_event", order_index: 2, title: "Scan companies of interest", description: "Scan booth QR codes to save companies and open roles." },
  { role: "student", phase: "during_event", order_index: 3, title: "Visit your saved companies", description: "Work through your saved list booth by booth." },
  { role: "student", phase: "during_event", order_index: 4, title: "Send messages / follow-ups", description: "Reach out to recruiters you connected with." },
  { role: "student", phase: "during_event", order_index: 5, title: "Mark booth visits", description: "Track which booths you have already visited." },
  { role: "student", phase: "post_event", order_index: 1, title: "Review companies you scanned", description: "Revisit the companies and roles you captured." },
  { role: "student", phase: "post_event", order_index: 2, title: "Message shortlisted companies", description: "Follow up with companies that shortlisted you." },
  { role: "student", phase: "post_event", order_index: 3, title: "Send follow-up notes", description: "Thank recruiters and reinforce your interest." },
  { role: "student", phase: "post_event", order_index: 4, title: "Track responses", description: "Keep an eye on replies and next steps." },
  { role: "company", phase: "pre_event", order_index: 1, title: "Complete company profile", description: "Add sector, description, website and logo." },
  { role: "company", phase: "pre_event", order_index: 2, title: "Add hiring roles", description: "List the roles you are recruiting for at the event." },
  { role: "company", phase: "pre_event", order_index: 3, title: "Review registered students", description: "Browse the talent pool before the event." },
  { role: "company", phase: "pre_event", order_index: 4, title: "Pre-shortlist candidates", description: "Flag priority candidates to visit your booth." },
  { role: "company", phase: "pre_event", order_index: 5, title: "Prepare booth instructions", description: "Brief your team on the scan-and-shortlist flow." },
  { role: "company", phase: "during_event", order_index: 1, title: "Scan student QR codes", description: "Capture each student you meet at the booth." },
  { role: "company", phase: "during_event", order_index: 2, title: "Shortlist candidates", description: "Mark students as shortlist, maybe or not a fit." },
  { role: "company", phase: "during_event", order_index: 3, title: "Add notes", description: "Record context for each candidate while it is fresh." },
  { role: "company", phase: "during_event", order_index: 4, title: "Message strong candidates", description: "Reach out to your best matches during the event." },
  { role: "company", phase: "post_event", order_index: 1, title: "Export your shortlist", description: "Download the candidate list for your team." },
  { role: "company", phase: "post_event", order_index: 2, title: "Send follow-up messages", description: "Keep momentum with shortlisted students." },
  { role: "company", phase: "post_event", order_index: 3, title: "Review analytics", description: "See your booth engagement and top skills." },
  { role: "company", phase: "post_event", order_index: 4, title: "Update hiring pipeline", description: "Move candidates into your interview pipeline." },
  { role: "event_manager", phase: "pre_event", order_index: 1, title: "Confirm attending companies", description: "Check which employers have joined with your event code." },
  { role: "event_manager", phase: "pre_event", order_index: 2, title: "Monitor student registrations", description: "Track sign-ups and check-in readiness." },
  { role: "event_manager", phase: "pre_event", order_index: 3, title: "Review readiness", description: "Check resume readiness across registered students." },
  { role: "event_manager", phase: "pre_event", order_index: 4, title: "Confirm QR setup", description: "Ensure every booth and student has a working QR." },
  { role: "event_manager", phase: "during_event", order_index: 1, title: "Monitor live scans", description: "Watch scan and engagement activity in real time." },
  { role: "event_manager", phase: "during_event", order_index: 2, title: "Help inactive students", description: "Reach out to students with low or no engagement." },
  { role: "event_manager", phase: "during_event", order_index: 3, title: "Track booth engagement", description: "See which employers are drawing the most interest." },
  { role: "event_manager", phase: "post_event", order_index: 1, title: "Generate report", description: "Compile the post-event outcome report." },
  { role: "event_manager", phase: "post_event", order_index: 2, title: "Export analytics", description: "Download engagement and outcome data." },
  { role: "event_manager", phase: "post_event", order_index: 3, title: "Review outcomes", description: "Assess shortlists, messages and follow-up completion." },
];
