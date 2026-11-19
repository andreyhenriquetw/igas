import { jsPDF } from "jspdf";
import { formatLocalDateTime } from "@/lib/time";
import type { CalendarEntryDto } from "@/types/calendar";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function buildContractText(entry: CalendarEntryDto): string {
  const total = entry.totalAmount ?? 0;
  const paid = entry.paidAmount ?? 0;

  return [
    "CONTRATO DE RESERVA",
    "MODELO EDITÁVEL — confira os dados e complete as informações antes de assinar.",
    "",
    "1. DAS PARTES",
    `CONTRATANTE: ${entry.guestName ?? "[nome do contratante]"}`,
    `Contato: ${entry.guestContact || "[telefone ou e-mail]"}`,
    `CPF: ${entry.guestCpf || "[CPF do contratante]"}`,
    `Endereço: ${entry.guestAddress || "[endereço completo do contratante]"}`,
    "CONTRATADA: [nome ou razão social, CPF/CNPJ e endereço do estabelecimento]",
    "",
    "2. DO OBJETO",
    `Reserva da modalidade ${entry.mode?.name ?? "[modalidade]"} para utilização do espaço no período indicado abaixo.`,
    "",
    "3. DO PERÍODO",
    `Entrada: ${formatLocalDateTime(entry.startsAt, "dd/MM/yyyy 'às' HH:mm")}`,
    `Saída: ${formatLocalDateTime(entry.endsAt, "dd/MM/yyyy 'às' HH:mm")}`,
    "",
    "4. DO VALOR E PAGAMENTO",
    `Valor total: ${money.format(total)}`,
    `Valor pago: ${money.format(paid)}`,
    `Saldo restante: ${money.format(total - paid)}`,
    "",
    "5. DAS CONDIÇÕES DA RESERVA",
    "[Descreva as regras de utilização, responsabilidades, cancelamento e demais condições acordadas.]",
    "",
    "6. DISPOSIÇÕES FINAIS",
    "As partes declaram que leram e concordam com as condições preenchidas neste instrumento.",
    "",
    "Por estarem de acordo, assinam este instrumento.",
    "",
    "__________________________________          __________________________________",
    "CONTRATANTE                                                     CONTRATADA",
    "",
    "Data: ______/______/____________",
  ].join("\n");
}

export function downloadContractPdf(contractText: string, guestName: string): void {
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxY = pageHeight - margin;
  const contentWidth = pageWidth - margin * 2;
  const lines = contractText.replace(/\r\n/g, "\n").split("\n");
  let y = margin;

  pdf.setProperties({ title: "Contrato de reserva", subject: guestName });

  lines.forEach((line, index) => {
    if (!line.trim()) {
      y += 3;
      return;
    }

    const isTitle = index === 0;
    const isSection = /^\d+\.\s/.test(line);
    const fontSize = isTitle ? 14 : 10;
    const lineHeight = isTitle ? 8 : 5;
    pdf.setFont("helvetica", isTitle || isSection ? "bold" : "normal");
    pdf.setFontSize(fontSize);

    const wrapped = pdf.splitTextToSize(line, contentWidth) as string[];
    for (const wrappedLine of wrapped) {
      if (y + lineHeight > maxY) {
        pdf.addPage();
        y = margin;
      }
      if (isTitle) {
        pdf.text(wrappedLine, pageWidth / 2, y, { align: "center" });
      } else {
        pdf.text(wrappedLine, margin, y);
      }
      y += lineHeight;
    }
    y += 1;
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  const filename = guestName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  pdf.save(`contrato-${filename || "reserva"}.pdf`);
}
