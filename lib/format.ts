/*
  Date and time formatting shared by the dashboards.

  Session times belong to the event, so they are entered and shown in the
  event's time zone (events.timezone). That way a student whose phone is set
  to another zone, or an organiser setting up from another city, still sees
  10:00 for a 10:00 workshop. Events made before time zones were stored have
  none, and their times use the viewer's zone as before. Personal times, like
  an interview a company proposes, use the viewer's zone and name it.
*/

/** The viewer's IANA time zone, e.g. "Asia/Kolkata". */
export function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone option for toLocale*: the event's zone when it has a valid one. */
const inZone = (tz?: string | null) => (isTimeZone(tz) ? { timeZone: tz } : {});

export function fmtTime(iso: string, tz?: string | null): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", ...inZone(tz) });
}

export function fmtDay(iso: string, tz?: string | null): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...inZone(tz) });
}

export function fmtDateTime(iso: string, tz?: string | null): string {
  return `${fmtDay(iso, tz)}, ${fmtTime(iso, tz)}`;
}

/** Date and time with the zone named ("Thu 2 Oct, 10:00 GMT+5:30"), for times two people in different places agree on. */
export function fmtDateTimeZoned(iso: string): string {
  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date(iso)).find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${fmtDateTime(iso)} ${zone}` : fmtDateTime(iso);
}

/**
 * Event start and end dates are calendar dates (stored as midnight UTC), so
 * they are shown in UTC. In the viewer's zone, a 1 October event would read
 * 30 September anywhere west of London.
 */
export function fmtEventDate(iso: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

/**
 * "Times are in India Standard Time" when the event's zone differs from the
 * viewer's, null when they match or the event has no zone.
 */
export function zoneNote(tz: string | null | undefined): string | null {
  if (!isTimeZone(tz)) return null;
  const now = new Date();
  const part = (zone: string | undefined, style: "longOffset" | "long", locale?: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value;
  if (part(tz, "longOffset", "en-US") === part(undefined, "longOffset", "en-US")) return null;
  const name = part(tz, "long") ?? tz;
  return `Times are in the event's time zone, ${name}.`;
}

/** A session with no end time is treated as one hour long, as the server does. */
export function sessionEnd(s: { starts_at: string; ends_at: string | null }): number {
  return s.ends_at ? new Date(s.ends_at).getTime() : new Date(s.starts_at).getTime() + 3600e3;
}

export function sessionPhase(s: { starts_at: string; ends_at: string | null }, now = Date.now()): "upcoming" | "live" | "ended" {
  if (now >= sessionEnd(s)) return "ended";
  return now >= new Date(s.starts_at).getTime() ? "live" : "upcoming";
}

/** Offset of `tz` from UTC at `ms`, in milliseconds. */
function zoneOffset(ms: number, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return wall - Math.floor(ms / 1000) * 1000;
}

/** Value for an <input type="datetime-local"> from an ISO string, in the event's zone (or local time). */
export function toLocalInput(iso: string | null, tz?: string | null): string {
  if (!iso) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  if (isTimeZone(tz)) {
    const d = new Date(new Date(iso).getTime() + zoneOffset(new Date(iso).getTime(), tz));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string from an <input type="datetime-local"> value, read in the event's zone (or local time). */
export function fromLocalInput(v: string, tz?: string | null): string | null {
  if (!v) return null;
  if (isTimeZone(tz)) {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return null;
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    // Guess with the offset at the wall time, then correct once for a DST change in between.
    let ms = wall - zoneOffset(wall, tz);
    ms = wall - zoneOffset(ms, tz);
    return new Date(ms).toISOString();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "Jun 2017": for things where the year matters more than the day, like a course completion. */
export function fmtMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
