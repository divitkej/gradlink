"use client";

import { useState } from "react";
import { GraduationCap, Building2, Briefcase, BookOpen } from "lucide-react";
import { SectionCard } from "./cards";
import type { AppRole } from "@/lib/session";

const MANUAL: Record<AppRole, { icon: React.ComponentType<{ size?: number }>; accent: string; steps: string[] }> = {
  student: {
    icon: GraduationCap,
    accent: "var(--cyan)",
    steps: [
      "View the companies registered for the event.",
      "Filter companies by sector and role to find your best fits.",
      "Save the companies you want to visit before the event.",
      "During the event, scan company QR codes to capture roles and booths.",
      "Show your own QR code so recruiters can pull up your profile instantly.",
      "Track your checklist across the pre-, during-, and post-event phases.",
      "After the event, follow up with companies that scanned or shortlisted you.",
    ],
  },
  company: {
    icon: Building2,
    accent: "var(--teal)",
    steps: [
      "Scan a student's QR code at your booth.",
      "View their full portfolio — skills, resume, links and bio.",
      "Check their AI resume score and feedback at a glance.",
      "Shortlist, reject, or mark a candidate as a maybe.",
      "Add private notes while the conversation is fresh.",
      "Message strong candidates directly from their profile.",
      "Review and export all scanned students after the event.",
    ],
  },
  event_manager: {
    icon: Briefcase,
    accent: "var(--amber)",
    steps: [
      "Track scans and engagement live as the event runs.",
      "View per-student analytics and readiness scores.",
      "Monitor company activity and booth engagement.",
      "Identify students with low or no engagement and help them.",
      "Scan any attendee to see their live event analytics.",
      "Export post-event reports and outcome analytics.",
    ],
  },
};

const TABS: { key: AppRole; label: string }[] = [
  { key: "student", label: "Students" },
  { key: "company", label: "Companies" },
  { key: "event_manager", label: "Event managers" },
];

export default function ManualSection({ defaultRole = "student" }: { defaultRole?: AppRole }) {
  const [active, setActive] = useState<AppRole>(defaultRole);
  const m = MANUAL[active];
  const Icon = m.icon;

  return (
    <SectionCard
      title="How to use this event platform"
      right={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          <BookOpen size={14} /> Manual
        </span>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              style={{
                fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: "var(--r-full)", cursor: "pointer",
                color: on ? "#021016" : "var(--text-2)",
                background: on ? "linear-gradient(100deg, var(--cyan), var(--teal))" : "rgba(255,255,255,0.04)",
                border: `1px solid ${on ? "transparent" : "var(--border)"}`,
                transition: "all 0.18s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {m.steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start", padding: "11px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
            <span
              style={{
                width: 24, height: 24, flexShrink: 0, borderRadius: "50%",
                background: "rgba(53,211,255,0.10)", border: `1px solid ${m.accent}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: m.accent, fontFamily: "var(--font-display)",
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.55, paddingTop: 2 }}>{step}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", color: m.accent }}>
        <Icon size={16} />
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          You&apos;re viewing the {TABS.find((t) => t.key === active)?.label.toLowerCase()} guide.
        </span>
      </div>
    </SectionCard>
  );
}
