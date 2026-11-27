import type { Metadata } from "next";
import { connection } from "next/server";
import { PublicBooking } from "@/components/public-booking";

export const metadata: Metadata = {
  title: "Balneário Ígas | Agendamento",
  description: "Conheça o Balneário Ígas e solicite seu agendamento.",
};

export default async function ClientPage() {
  await connection();
  return <PublicBooking />;
}
