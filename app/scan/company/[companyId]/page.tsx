"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import CompanyScanView from "@/components/scan/CompanyScanView";
import { useActiveEvent } from "@/lib/use-active-event";
import { LoadingBlock } from "@/components/dashboard/cards";

function Inner() {
  const params = useParams();
  const sp = useSearchParams();
  const companyId = String(params.companyId);
  const { eventId: activeEventId } = useActiveEvent();
  // A scanned QR always carries its event id; hand-typed URLs fall back
  // to whichever event the viewer currently has open.
  const eventId = sp.get("eventId") || activeEventId || "";
  return <CompanyScanView companyProfileId={companyId} eventId={eventId} />;
}

export default function CompanyScanPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingBlock /></div>}>
      <Inner />
    </Suspense>
  );
}
