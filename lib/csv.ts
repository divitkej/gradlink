/* CSV building and download, shared by the college report and the company export. */

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  // A leading =, +, - or @ would run as a formula in Excel, so it is quoted as text.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csvRows(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Trigger a browser download. The BOM makes Excel open UTF-8 correctly instead of mangling accents. */
export function downloadCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob(["﻿" + csvRows(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
