"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, CameraOff, ArrowRight, LayoutDashboard, ScanLine, Search } from "lucide-react";
import Logo from "@/components/Logo";
import QRCard from "@/components/dashboard/QRCard";
import ViewerGate from "./ViewerGate";
import { SectionCard, Avatar, LoadingBlock, FlagPill } from "@/components/dashboard/cards";
import { Button } from "@/components/ui/primitives";
import { useSession, ROLE_LABEL } from "@/lib/session";
import { useActiveEvent } from "@/lib/use-active-event";
import { getRegisteredStudents, getRegisteredCompanies, type StudentRow, type CompanyRow } from "@/lib/db";

function roleHome(role: string) {
  return role === "event_manager" ? "/dashboard/event-manager" : `/dashboard/${role}`;
}

export default function Scanner() {
  const { session, ready } = useSession();
  const { eventId, status: eventStatus } = useActiveEvent();
  const viewer = session?.role ?? null;
  const router = useRouter();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [manual, setManual] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!viewer || !eventId) return;
    (async () => {
      if (viewer === "company" || viewer === "event_manager") setStudents(await getRegisteredStudents(eventId));
      if (viewer === "student" || viewer === "event_manager") setCompanies(await getRegisteredCompanies(eventId));
    })();
  }, [viewer, eventId]);

  function go(path: string) {
    try {
      const u = path.startsWith("http") ? new URL(path) : null;
      router.push(u ? u.pathname + u.search : path);
    } catch {
      router.push(path);
    }
  }

  function submitManual() {
    const v = manual.trim();
    if (!v) return;
    if (v.includes("/scan/")) return go(v);
    // bare id — guess by viewer
    if (viewer === "student") go(`/scan/company/${v}?eventId=${eventId}`);
    else go(`/scan/student/${v}?eventId=${eventId}`);
  }

  async function startCamera() {
    setCamErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamErr("This device can't open the camera here. Tap someone below or paste a link.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCamOn(true);
      // Native fast path where available (Chrome/Edge); jsQR fallback works everywhere else (incl. iOS Safari).
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      const detector = BD ? new BD({ formats: ["qr_code"] }) : null;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let frame = 0;
      const tick = async () => {
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth) {
          try {
            if (detector) {
              const codes = await detector.detect(video);
              if (codes.length) { const v = codes[0].rawValue; stopCamera(); go(v); return; }
            } else if (ctx && frame++ % 2 === 0) {
              const scale = Math.min(1, 640 / video.videoWidth);
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
              if (code && code.data) { stopCamera(); go(code.data); return; }
            }
          } catch { /* keep trying */ }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch(() => {});
        }
        rafRef.current = requestAnimationFrame(tick);
      }, 60);
    } catch {
      setCamErr("Couldn't access the camera — allow camera permission, or tap someone below / paste a link.");
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  useEffect(() => () => stopCamera(), []);

  if (!ready) return <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}><LoadingBlock /></div>;
  if (!viewer || !session) return <ViewerGate onPick={() => {}} hint="Choose your role to start scanning." />;
  if (eventStatus !== "ready" || !eventId) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}><Logo size={24} /></div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            Join an event first
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 20 }}>
            Scanning records who met whom at a specific event, so you need to be in one before the scanner opens.
          </p>
          <Link href="/dashboard/events" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 44, padding: "0 20px", borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#0A0A0A", background: "linear-gradient(100deg, var(--accent), var(--accent-2))", textDecoration: "none" }}>
            Go to events
          </Link>
        </div>
      </div>
    );
  }

  const myPayload = viewer === "student"
    ? `/scan/student/${session.profileId}?eventId=${eventId}`
    : viewer === "company"
    ? `/scan/company/${session.profileId}?eventId=${eventId}`
    : null;

  const peopleTitle = viewer === "student" ? "Companies to scan" : viewer === "company" ? "Students to scan" : "Scan anyone";
  const people: { id: string; name: string; sub: string; route: string; tone?: string }[] =
    viewer === "student"
      ? companies.map((c) => ({ id: c.id, name: c.company_name ?? c.company ?? "Company", sub: `Booth ${c.booth_number ?? "—"} · ${c.sector ?? ""}`, route: `/scan/company/${c.profile_id}?eventId=${eventId}`, tone: "var(--accent-2)" }))
      : viewer === "company"
      ? students.map((s) => ({ id: s.id, name: s.full_name, sub: [s.degree, s.university].filter(Boolean).join(" · "), route: `/scan/student/${s.profile_id}?eventId=${eventId}` }))
      : [
          ...students.map((s) => ({ id: s.id, name: s.full_name, sub: `Student · ${s.university ?? ""}`, route: `/scan/student/${s.profile_id}?eventId=${eventId}` })),
          ...companies.map((c) => ({ id: c.id, name: c.company_name ?? c.company ?? "Company", sub: `Company · Booth ${c.booth_number ?? "—"}`, route: `/scan/company/${c.profile_id}?eventId=${eventId}`, tone: "var(--accent-2)" })),
        ];

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "rgba(10,10,10,0.7)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>
        <Link href={roleHome(viewer)} aria-label="Back to dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-2)", textDecoration: "none", fontSize: 13.5 }}>
          <LayoutDashboard size={16} /> Dashboard
        </Link>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><Logo size={20} /></div>
        <FlagPill label={ROLE_LABEL[viewer]} tone="cyan" icon={<ScanLine size={12} />} />
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: 680, margin: "0 auto", padding: "22px 18px 60px", display: "flex", flexDirection: "column", gap: 18 }}>
        {myPayload && (
          <SectionCard title="My event QR" accent="var(--border-strong)">
            <QRCard payload={myPayload} caption={session.name} sub={`${ROLE_LABEL[viewer]} · ${session.org}`} accent={viewer === "company" ? "var(--accent-2)" : "var(--accent)"} filename={`gradlink-${viewer}-qr`} />
          </SectionCard>
        )}

        <SectionCard title="Scan a QR code" right={camOn ? <Button variant="secondary" icon={<CameraOff size={14} />} onClick={stopCamera}>Stop</Button> : <Button variant="primary" icon={<Camera size={14} />} onClick={startCamera}>Camera</Button>}>
          {camOn ? (
            <div style={{ position: "relative", borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--border-strong)", aspectRatio: "4/3", background: "#000" }}>
              <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: "18% 22%", border: "2px solid var(--accent)", borderRadius: 14, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
            </div>
          ) : (
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
              Point your camera at a GradLink QR, or tap someone below to simulate a scan.
            </p>
          )}
          {camErr && <p style={{ fontSize: 12.5, color: "var(--amber)", marginTop: 10 }}>{camErr}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
              <Search size={15} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
              <input value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitManual()} placeholder="Paste a QR link or ID…"
                style={{ width: "100%", height: 42, padding: "0 12px 0 34px", fontSize: 13.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none" }} />
            </div>
            <Button variant="secondary" icon={<ArrowRight size={15} />} onClick={submitManual}>Open</Button>
          </div>
        </SectionCard>

        <SectionCard title={peopleTitle} hint={`${people.length} at this event`}>
          {people.length === 0 ? (
            <LoadingBlock label="Loading attendees…" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {people.map((p) => (
                <button key={p.id} onClick={() => go(p.route)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", textAlign: "left", transition: "border-color 0.15s" }}>
                  <Avatar name={p.name} size={38} tone={p.tone ?? "var(--accent)"} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{p.name}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.sub}</span>
                  </span>
                  <ScanLine size={16} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </main>
    </div>
  );
}
