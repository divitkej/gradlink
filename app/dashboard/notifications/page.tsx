"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import NotificationsList from "@/components/dashboard/NotificationsList";
import { useSession } from "@/lib/session";

export default function NotificationsPage() {
  const { session } = useSession();
  return (
    <DashboardShell title="Notifications">
      {session && <NotificationsList profileId={session.profileId} />}
    </DashboardShell>
  );
}
