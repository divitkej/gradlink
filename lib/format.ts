/* Date and time formatting shared by the dashboards. Times use the viewer's locale and zone. */

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function fmtDateTime(iso: string): string {
  return `${fmtDay(iso)}, ${fmtTime(iso)}`;
}

/** A session with no end time is treated as one hour long, as the server does. */
export function sessionEnd(s: { starts_at: string; ends_at: string | null }): number {
  return s.ends_at ? new Date(s.ends_at).getTime() : new Date(s.starts_at).getTime() + 3600e3;
}

export function sessionPhase(s: { starts_at: string; ends_at: string | null }, now = Date.now()): "upcoming" | "live" | "ended" {
  if (now >= sessionEnd(s)) return "ended";
  return now >= new Date(s.starts_at).getTime() ? "live" : "upcoming";
}

/** Value for an <input type="datetime-local"> from an ISO string, in local time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string from an <input type="datetime-local"> value (read as local time). */
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
