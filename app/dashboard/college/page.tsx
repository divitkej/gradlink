import { redirect } from "next/navigation";

// "College" is now the Event Manager workspace — keep the old route working.
export default function CollegeRedirect() {
  redirect("/dashboard/event-manager");
}
