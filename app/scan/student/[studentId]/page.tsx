"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import StudentScanView from "@/components/scan/StudentScanView";
import { DEMO_EVENT_ID } from "@/lib/demo-session";
import { LoadingBlock } from "@/components/dashboard/cards";

function Inner() {
  const params = useParams();
  const sp = useSearchParams();
  const studentId = String(params.studentId);
  const eventId = sp.get("eventId") || DEMO_EVENT_ID;
  return <StudentScanView studentProfileId={studentId} eventId={eventId} />;
}

export default function StudentScanPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingBlock /></div>}>
      <Inner />
    </Suspense>
  );
}
