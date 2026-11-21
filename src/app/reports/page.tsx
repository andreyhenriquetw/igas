import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { ReportsDashboard } from "@/components/reports-dashboard";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export default async function ReportsPage() {
  await connection();
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  return (
    <>
      <AppHeader user={user} current="reports" />
      <ReportsDashboard />
    </>
  );
}
