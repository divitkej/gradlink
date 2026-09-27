import { db } from "./sql";
import {
  FOUNDING_LIMIT, PASS_CREDIT_DAYS, TRIAL_MAX_EVENT_DAYS, TRIAL_REPORT_DAYS,
} from "../pricing";

/* ============================================================
   Server-side entitlement. Who gets the paid features, and why.

   A college's event has the paid features (full outcome report and
   CSV export) when any of these hold:
     * the college has an active Placement Pro subscription;
     * an Event Pass was spent on that event;
     * it is the college's first event (the trial event) and it ended
       less than TRIAL_REPORT_DAYS ago.

   Creating an event is allowed for the first event, with an active
   subscription, or by spending an unused Event Pass. The rules are SQL
   fragments so createEvent can check them inside its own transaction.
   ============================================================ */

/**
 * True when profile `$1` has a subscription granting paid features. An
 * expired period counts as lapsed even if Stripe hasn't sent the cancellation
 * webhook yet.
 */
export const ACTIVE_SUB_SQL = `exists (
  select 1 from subscriptions
  where profile_id = $1 and plan = 'pro' and status in ('active', 'past_due')
    and (current_period_end is null or current_period_end > now()))`;

/** When the trial window of event `e` closes. */
const TRIAL_ENDS_SQL = `(date_trunc('day', least(
    coalesce(e.end_date, e.start_date, e.created_at),
    e.created_at + interval '${TRIAL_MAX_EVENT_DAYS} days'))
  + interval '${TRIAL_REPORT_DAYS + 1} days')`;

export type AccessReason = "subscription" | "pass" | "trial" | "none";

export interface EventAccess {
  full: boolean;
  reason: AccessReason;
  /** Set for the trial event: when its paid features lock. */
  trialEndsAt: string | null;
}

/** Paid-feature access for one event, as seen by the college that owns it. */
export async function eventAccess(profileId: string, eventId: string): Promise<EventAccess> {
  const rows = await db().query(
    `select
       ${ACTIVE_SUB_SQL} as subscribed,
       exists (select 1 from event_passes where profile_id = $1 and event_id = e.id) as passed,
       e.id = (select id from events where created_by = $1 order by created_at, id limit 1) as is_trial,
       ${TRIAL_ENDS_SQL} as trial_ends_at,
       ${TRIAL_ENDS_SQL} > now() as trial_open
     from events e
     where e.id = $2 and e.created_by = $1`,
    [profileId, eventId],
  );
  const r = rows[0];
  if (!r) return { full: false, reason: "none", trialEndsAt: null };
  const trialEndsAt = r.is_trial ? new Date(r.trial_ends_at as string).toISOString() : null;
  if (r.subscribed) return { full: true, reason: "subscription", trialEndsAt: null };
  if (r.passed) return { full: true, reason: "pass", trialEndsAt: null };
  if (r.is_trial && r.trial_open) return { full: true, reason: "trial", trialEndsAt };
  return { full: false, reason: "none", trialEndsAt };
}

/** Passes bought recently and not yet taken off a Placement Pro checkout. */
export async function creditablePasses(profileId: string): Promise<{ ids: string[]; amountMinor: number; currency: string | null }> {
  const rows = await db().query(
    `select id, amount_minor, currency from event_passes
     where profile_id = $1 and credited_at is null
       and created_at > now() - interval '${PASS_CREDIT_DAYS} days'
     order by created_at desc limit 10`,
    [profileId],
  );
  return {
    ids: rows.map((r) => r.id as string),
    amountMinor: rows.reduce((sum, r) => sum + Number(r.amount_minor), 0),
    currency: (rows[0]?.currency as string | undefined) ?? null,
  };
}

export interface BillingState {
  subscribed: boolean;
  /** The college has created at least one event, so its trial is taken. */
  trialUsed: boolean;
  unusedPasses: number;
  /** Event Pass money (minor units) that would come off a Placement Pro checkout now. */
  passCreditMinor: number;
}

export async function billingState(profileId: string): Promise<BillingState> {
  const rows = await db().query(
    `select
       ${ACTIVE_SUB_SQL} as subscribed,
       exists (select 1 from events where created_by = $1) as trial_used,
       (select count(*) from event_passes where profile_id = $1 and event_id is null)::int as unused_passes`,
    [profileId],
  );
  const r = rows[0] ?? {};
  const credit = await creditablePasses(profileId);
  return {
    subscribed: Boolean(r.subscribed),
    trialUsed: Boolean(r.trial_used),
    unusedPasses: Number(r.unused_passes ?? 0),
    passCreditMinor: credit.amountMinor,
  };
}

/** Whether the founding price is still open, counted in colleges. */
export async function foundingOpen(): Promise<boolean> {
  const rows = await db()`select count(*)::int as used from subscriptions where founding`;
  return Number(rows[0]?.used ?? 0) < FOUNDING_LIMIT;
}
