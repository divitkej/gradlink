"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import CompanyScanView from "@/components/scan/CompanyScanView";
import { DEMO_EVENT_ID } from "@/lib/demo-session";
import { LoadingBlock } from "@/components/dashboard/cards";

function Inner() {
  const params = useParams();
  const sp = useSearchParams();
  const companyId = String(params.companyId);
  const eventId = sp.get("eventId") || DEMO_EVENT_ID;
  return <CompanyScanView companyProfileId={companyId} eventId={eventId} />;
}

export default function CompanyScanPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingBlock /></div>}>
      <Inner />
    </Suspense>
  );
}
