import type { Metadata } from "next";
import { PublicBooking } from "@/components/public-booking";

export const metadata: Metadata = {
  title: "Balneário Ígas | Agendamento",
  description: "Conheça o Balneário Ígas e solicite seu agendamento.",
};

export default function ClientPage() {
  return <PublicBooking />;
}
