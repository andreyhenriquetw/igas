import { connection } from "next/server";
import { PublicBooking } from "@/components/public-booking";

export default async function PublicBookingPage() {
  await connection();
  return <PublicBooking />;
}
