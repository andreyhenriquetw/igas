import { connection } from "next/server";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { Calendar } from "@/components/calendar/calendar";
import { findEntriesForPeriod } from "@/lib/entries";
import { getPrisma } from "@/lib/prisma";
import { TIME_ZONE } from "@/lib/time";

function currentMonthRange() {
  const month = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM");
  const [year, monthNumber] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  return { start: `${month}-01`, end };
}

export default async function HomePage() {
  await connection();
  const session = await auth();
  const prisma = getPrisma();
  if (!session?.user?.id) {
    redirect((await prisma.user.count()) > 0 ? "/login" : "/setup");
  }

  const range = currentMonthRange();
  const [modes, entries] = await Promise.all([
    prisma.reservationMode.findMany({ orderBy: { name: "asc" } }),
    findEntriesForPeriod(range.start, range.end),
  ]);

  return (
    <>
      <AppHeader user={session.user} current="calendar" />
      <Calendar initialEntries={entries} modes={modes} />
    </>
  );
}
