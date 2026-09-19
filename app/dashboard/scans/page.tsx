"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { GlassPanel, PanelTitle } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/primitives";
import { Avatar, LoadingBlock } from "@/components/dashboard/cards";
import { History } from "lucide-react";
import { useSession } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import { getScans, getProfileNames, type ScanRow } from "@/lib/db";

export default function ScansPage() {
  const { session, ready } = useSession();
  const { eventId } = useActiveEvent();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [names, setNames] = useState<Record<string, { name: string; role: string; org: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !session || !eventId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Scans where I'm involved (as scanner or as the one scanned).
      const [inbound, outbound] = await Promise.all([
        getScans({ eventId, scannedProfileId: session.profileId }),
        getScans({ eventId, scannerProfileId: session.profileId }),
      ]);
      const all = [...inbound, ...outbound].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      const ids = all.flatMap((s) => [s.scanner_profile_id, s.scanned_profile_id]).filter(Boolean) as string[];
      const n = await getProfileNames(ids);
      if (cancelled) return;
      setScans(all); setNames(n); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ready, session, eventId]);

  return (
    <DashboardShell title="Scan History">
      <GlassPanel style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 14px" }}><PanelTitle hint={`${scans.length} scans`}>Your scan history</PanelTitle></div>
        {loading ? (
          <LoadingBlock label="Loading scans…" />
        ) : scans.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "34px 24px 42px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: "rgba(53,211,255,0.08)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)" }}><History size={22} /></div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>No scans yet</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, lineHeight: 1.55 }}>Every QR scan you make — or that someone makes of you — will be logged here.</p>
          </div>
        ) : (
          scans.map((s) => {
            const mineScanner = s.scanner_profile_id === session?.profileId;
            const otherId = (mineScanner ? s.scanned_profile_id : s.scanner_profile_id) ?? "";
            const other = names[otherId];
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 22px", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                  <Avatar name={other?.name ?? "GradLink"} size={32} tone={other?.role === "company" ? "var(--teal)" : "var(--cyan)"} />
                  <div>
                    <div style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 500 }}>{mineScanner ? `You scanned ${other?.name ?? "a profile"}` : `${other?.name ?? "Someone"} scanned you`}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.scan_context ?? "scan"}{s.notes ? ` · ${s.notes}` : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge tone={mineScanner ? "cyan" : "teal"}>{mineScanner ? "Outgoing" : "Incoming"}</Badge>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        )}
      </GlassPanel>
    </DashboardShell>
  );
}
