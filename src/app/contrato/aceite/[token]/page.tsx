import type { Metadata } from "next";
import { ContractAcceptance } from "@/components/contract-acceptance";

export const metadata: Metadata = {
  title: "Aceite do contrato | ÍGAS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ContractAcceptancePage({
  params,
}: PageProps<"/contrato/aceite/[token]">) {
  const { token } = await params;
  return <ContractAcceptance token={token} />;
}
