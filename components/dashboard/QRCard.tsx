"use client";

import { useRef, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Share2, Check, QrCode as QrIcon } from "lucide-react";
import { Button } from "@/components/ui/primitives";

/**
 * Real, scannable QR code for a profile at an event.
 * `payload` is a relative route (e.g. /scan/student/<id>?eventId=<id>);
 * the full origin is prefixed at runtime so the QR works on any device.
 */
export default function QRCard({
  payload,
  caption,
  sub,
  accent = "var(--accent)",
  filename = "gradlink-qr",
}: {
  payload: string;
  caption: string;
  sub?: string;
  accent?: string;
  filename?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const hydrated = useHydrated();

  // The QR has to encode an absolute URL so it resolves on the scanning phone,
  // but window.location is only readable after hydration.
  const url = hydrated && !payload.startsWith("http")
    ? window.location.origin + payload
    : payload;

  function download() {
    const canvas = ref.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "GradLink", text: caption, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
        <div
          ref={ref}
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 12,
            border: "1px solid var(--border-strong)",
            boxShadow: `0 0 0 1px rgba(255,255,255,0.12), 0 14px 40px rgba(0,0,0,0.4)`,
            flexShrink: 0,
            position: "relative",
          }}
        >
          <QRCodeCanvas value={url} size={132} level="M" marginSize={1} bgColor="#ffffff" fgColor="#080808" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: accent, marginBottom: 6 }}>
            <QrIcon size={13} /> Event QR
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-display)" }}>{caption}</div>
          {sub && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5, maxWidth: 240 }}>
            Show this at the booth — a scan opens your live profile instantly.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="primary" icon={<Download size={15} />} onClick={download}>Download</Button>
        <Button variant="secondary" icon={copied ? <Check size={15} /> : <Share2 size={15} />} onClick={share}>
          {copied ? "Link copied" : "Share"}
        </Button>
      </div>
    </div>
  );
}
