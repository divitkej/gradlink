"use client";

import { useSyncExternalStore } from "react";

let cached: string[] | null = null;
function browserZones(): string[] {
  if (!cached) {
    const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    cached = all.includes("UTC") ? all : [...all, "UTC"];
  }
  return cached;
}
const NONE: string[] = [];
const subscribe = () => () => {};

/**
 * Every IANA time zone the browser knows, as a <select>. The server renders
 * no options, since its zone list and the browser's can differ.
 */
export default function TimeZoneSelect({ id, value, onChange, style }: {
  id?: string;
  value: string;
  onChange: (tz: string) => void;
  style?: React.CSSProperties;
}) {
  const zones = useSyncExternalStore(subscribe, browserZones, () => NONE);
  const list = value && !zones.includes(value) ? [value, ...zones] : zones;
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={style}>
      {list.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
    </select>
  );
}

/** The viewer's time zone, or "" while rendering on the server. */
export function useLocalZone(): string {
  return useSyncExternalStore(subscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "");
}
