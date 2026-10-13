"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import StudentScanView from "@/components/scan/StudentScanView";
import { useActiveEvent } from "@/lib/use-active-event";
import { LoadingBlock } from "@/components/dashboard/cards";

function Inner() {
  const params = useParams();
  const sp = useSearchParams();
  const studentId = String(params.studentId);
  const { eventId: activeEventId } = useActiveEvent();
  // A scanned QR always carries its event id; hand-typed URLs fall back
  // to whichever event the viewer currently has open.
  const eventId = sp.get("eventId") || activeEventId || "";
  // `k` is the student's scan key, only present when their QR was scanned.
  return <StudentScanView studentProfileId={studentId} eventId={eventId} scanKey={sp.get("k")} />;
}

export default function StudentScanPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingBlock /></div>}>
      <Inner />
    </Suspense>
  );
}
