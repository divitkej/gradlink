"use client";

import { api } from "./api-client";

/* ============================================================
   Student email domains that colleges register at sign-up. Students
   can only sign up with an address on a domain the owner approved at
   /admin/colleges.
   ============================================================ */

export type DomainStatus = "pending" | "approved" | "rejected";

export interface CollegeDomain {
  domain: string;
  institution: string;
  status: DomainStatus;
  requested_by_email: string | null;
  /** Whether the requester's own email is on the same organisation's domain. */
  staff_domain_matches: boolean;
  created_at: string;
  decided_at: string | null;
}

/** Owner only; everyone else gets a 404 ApiError. */
export async function listCollegeDomains(): Promise<CollegeDomain[]> {
  return (await api<{ domains: CollegeDomain[] }>("/api/admin/college-domains")).domains;
}

/** Owner only. `approveAs` widens a request to a parent domain, e.g. ku.ac.ae. */
export async function decideCollegeDomain(domain: string, action: "approve" | "reject", approveAs?: string): Promise<CollegeDomain[]> {
  return (await api<{ domains: CollegeDomain[] }>("/api/admin/college-domains", { domain, action, approveAs })).domains;
}

/** The signed-in college's own domain and its approval status, or null. */
export async function myCollegeDomain(): Promise<{ domain: string; status: DomainStatus } | null> {
  return (await api<{ registration: { domain: string; status: DomainStatus } | null }>("/api/college-domain")).registration;
}
