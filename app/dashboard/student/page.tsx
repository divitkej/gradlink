import DashboardShell from "@/components/dashboard/DashboardShell";
import StudentDashboard from "@/components/dashboard/StudentDashboard";

export const metadata = { title: "Student Dashboard — GradLink" };

export default function StudentPage() {
  return (
    <DashboardShell role="student" title="Student Overview">
      <StudentDashboard />
    </DashboardShell>
  );
}
