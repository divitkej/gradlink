"use client";

import { rpc } from "./api-client";

/* ============================================================
   Owner dashboard data (/admin). The server only answers for the
   emails in ADMIN_EMAILS; everyone else gets a 404.
   ============================================================ */

export interface AdminTotals {
  colleges: number;
  students: number;
  companies: number;
  signups_7d: number;
  events: number;
  live_events: number;
  registrations: number;
  scans: number;
  scans_1h: number;
  messages_24h: number;
}

export interface AdminCollege {
  id: string;
  full_name: string;
  email: string;
  organization: string | null;
  created_at: string;
  plan_choice: "free" | "pro" | null;
  plan_selected_at: string | null;
  sub_plan: "free" | "pro" | null;
  sub_status: string | null;
  current_period_end: string | null;
}

export interface AdminEvent {
  id: string;
  title: string;
  status: "draft" | "upcoming" | "live" | "ended";
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  created_by: string | null;
  host_org: string | null;
  student_code: string | null;
  company_code: string | null;
  students: number;
  companies: number;
  scans: number;
  scans_15m: number;
  last_scan_at: string | null;
  shortlists: number;
  messages: number;
}

export interface AdminError {
  id: string;
  created_at: string;
  scope: string;
  message: string;
}

export interface AdminOverview {
  generatedAt: string;
  health: { dbLatencyMs: number; errors1h: number; errors24h: number };
  totals: AdminTotals;
  colleges: AdminCollege[];
  events: AdminEvent[];
  errors: AdminError[];
}

/** Throws on failure so the page can tell "not allowed" from "down". */
export function getAdminOverview(): Promise<AdminOverview> {
  return rpc<AdminOverview>("adminOverview");
}
