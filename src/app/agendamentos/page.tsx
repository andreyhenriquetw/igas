import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { BookingsDashboard } from "@/components/bookings-dashboard";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { EntryKind, EntryStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import { serializeEntry } from "@/lib/entries";

export default async function BookingsPage() {
  await connection();
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const entries = await getPrisma().calendarEntry.findMany({
    where: {
      kind: EntryKind.BOOKING,
      status: EntryStatus.PENDING,
    },
    include: { mode: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <>
      <AppHeader user={user} current="bookings" />
      <BookingsDashboard initialEntries={entries.map(serializeEntry)} />
    </>
  );
}
