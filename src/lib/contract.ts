import { jsPDF } from "jspdf";
import { formatLocalDateTime } from "@/lib/time";
import type { CalendarEntryDto } from "@/types/calendar";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const landlordName = "Holdernes Carvalho Serrão";
const landlordCpf = "020.894.192-45";

export type ContractSignatureData = {
  landlordAcceptedAt: string | null;
  tenantAcceptedName: string | null;
  tenantAcceptedAt: string | null;
};

function underThousandInWords(value: number): string {
  const units = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (value === 0) return "zero";
  if (value === 100) return "cem";
  if (value < 10) return units[value];
  if (value < 20) return teens[value - 10];
  if (value < 100) {
    const remainder = value % 10;
    return remainder ? `${tens[Math.floor(value / 10)]} e ${units[remainder]}` : tens[value / 10];
  }

  const remainder = value % 100;
  return remainder
    ? `${hundreds[Math.floor(value / 100)]} e ${underThousandInWords(remainder)}`
    : hundreds[value / 100];
}

function integerInWords(value: number): string {
  if (value < 1_000) return underThousandInWords(value);

  if (value < 1_000_000) {
    const thousands = Math.floor(value / 1_000);
    const remainder = value % 1_000;
    const prefix = thousands === 1 ? "mil" : `${underThousandInWords(thousands)} mil`;
    if (!remainder) return prefix;
    return `${prefix}${remainder < 100 || remainder % 100 === 0 ? " e " : " "}${underThousandInWords(remainder)}`;
  }

  const millions = Math.floor(value / 1_000_000);
  const remainder = value % 1_000_000;
  const prefix = `${integerInWords(millions)} ${millions === 1 ? "milhão" : "milhões"}`;
  if (!remainder) return prefix;
  return `${prefix}${remainder < 100 || remainder % 100 === 0 ? " e " : " "}${integerInWords(remainder)}`;
}

function currencyInWords(value: number): string {
  const cents = Math.round(Math.abs(value) * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const reaisText = `${integerInWords(reais)} ${reais === 1 ? "real" : "reais"}`;

  if (!centavos) return reaisText;
  const centsText = `${integerInWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return `${reaisText} e ${centsText}`;
}

function reservationDate(entry: CalendarEntryDto): string {
  return `${formatLocalDateTime(entry.startsAt, "dd/MM/yyyy")} (${formatLocalDateTime(entry.startsAt, "EEEE")})`;
}

function checkInTime(entry: CalendarEntryDto): string {
  return formatLocalDateTime(entry.startsAt, "HH'h'");
}

function checkOutDate(entry: CalendarEntryDto): string {
  return `${formatLocalDateTime(entry.endsAt, "dd/MM/yyyy")} (${formatLocalDateTime(entry.endsAt, "EEEE")})`;
}

function paymentClause(entry: CalendarEntryDto): string {
  const totalCents = Math.round((entry.totalAmount ?? 0) * 100);
  const paidCents = Math.round((entry.paidAmount ?? 0) * 100);
  const deposit = Math.round(totalCents / 2) / 100;
  const total = totalCents / 100;
  const paid = paidCents / 100;
  const balance = (totalCents - paidCents) / 100;
  const startDate = formatLocalDateTime(entry.startsAt, "dd/MM/yyyy");

  return `O valor total da locação é de ${money.format(total)} (${currencyInWords(total)}). Para confirmação da reserva, deverá ser pago sinal de 50%, equivalente a ${money.format(deposit)}. Valor já pago: ${money.format(paid)}. O saldo restante de ${money.format(balance)} deverá ser pago no check-in, em ${startDate}.`;
}

function signatureDate(entry: CalendarEntryDto): string {
  return `Santarém/PA, ${formatLocalDateTime(entry.createdAt, "d 'de' MMMM 'de' yyyy")}.`;
}

function signatureColumns(entry: CalendarEntryDto): [string, string, string] {
  return [
    `${landlordName}\t${entry.guestName || "[NOME DO LOCATÁRIO]"}`,
    `LOCADOR\tLOCATÁRIO`,
    `CPF: ${landlordCpf}\tCPF: ${entry.guestCpf || "[CPF NÃO INFORMADO]"}`,
  ];
}

export function buildContractText(entry: CalendarEntryDto): string {
  const guestName = entry.guestName || "[NOME DO LOCATÁRIO]";
  const guestCpf = entry.guestCpf || "[CPF NÃO INFORMADO]";
  const modality = entry.mode?.name.toLocaleUpperCase("pt-BR") ?? "[MODALIDADE]";
  const signatures = signatureColumns(entry);

  return [
    "CONTRATO DE LOCAÇÃO — ÍGAS",
    "",
    "1. IDENTIFICAÇÃO DAS PARTES",
    `LOCADOR: ${landlordName}, CPF: ${landlordCpf}.`,
    `LOCATÁRIO: ${guestName}, CPF: ${guestCpf}.`,
    `MODALIDADE: ${modality}.`,
    "",
    "2. OBJETO",
    "O presente contrato tem por objeto a locação temporária do espaço ÍGAS Balneário, para utilização exclusiva do LOCATÁRIO e de seus convidados, para lazer e confraternização.",
    "",
    "3. PERÍODO, CHECK-IN E CHECK-OUT",
    `Data da locação: ${reservationDate(entry)}.`,
    `Check-in: a partir das ${checkInTime(entry)}.`,
    `Check-out: até as ${formatLocalDateTime(entry.endsAt, "HH'h'")} do dia ${checkOutDate(entry)}.`,
    "",
    "4. VALOR E CONDIÇÕES DE PAGAMENTO",
    paymentClause(entry),
    "",
    "5. CAPACIDADE E UTILIZAÇÃO DO ESPAÇO",
    "O espaço estará disponível para acomodar até 24 (vinte e quatro) pessoas, entre adultos e crianças.",
    "Na modalidade pernoite, o espaço dispõe de 2 (dois) quartos, com a seguinte estrutura: 1 (uma) cama de casal, 1 (uma) cama de solteiro e 1 (uma) rede. A ocupação fica limitada a 4 (quatro) pessoas por quarto, respeitando o limite máximo estabelecido.",
    "O espaço também conta com uma maloca com capacidade para até 16 (dezesseis) redes, oferecendo uma alternativa de acomodação para os hóspedes.",
    "",
    "6. ESTRUTURA DISPONIBILIZADA",
    "- Área de lazer e churrasqueira;",
    "- Cozinha completa, geladeira e cervejeira;",
    "- Smart TV Samsung 55” com controle remoto, YouTube Premium sem anúncios e Globoplay configurados;",
    "- Decodificador Vivensis, caixa de som JBL PartyBox 310 e Wi-Fi;",
    "- Liquidificador, 20 pratos, talheres e copos americanos;",
    "- 10 jogos de mesa, 02 mesas grandes e 05 cadeiras de praia.",
    "",
    "7. RESPONSABILIDADES DO LOCATÁRIO",
    "O LOCATÁRIO deverá zelar pelo imóvel, móveis, equipamentos, utensílios e demais itens disponibilizados, respondendo por danos, perdas ou avarias causados por si ou por seus convidados. Deverá respeitar as regras de conservação, segurança e boa convivência do espaço.",
    "",
    "8. RESPONSABILIDADES DO LOCADOR",
    "O LOCADOR compromete-se a disponibilizar o espaço no período contratado, em condições adequadas de uso, juntamente com os itens descritos neste contrato, ressalvadas situações de manutenção, caso fortuito ou força maior.",
    "",
    "9. REGRAS DE UTILIZAÇÃO",
    "O espaço deverá ser utilizado exclusivamente para lazer e confraternização. Não será permitida a prática de atividades ilícitas ou a utilização do local para finalidade diversa da acordada. O LOCATÁRIO deverá orientar seus convidados a respeitar o imóvel, os equipamentos e a vizinhança.",
    "",
    "10. PRESERVAÇÃO DO IGARAPÉ E DAS COMPORTAS",
    "É proibido encher, secar, represar ou alterar o fluxo do igarapé, bem como manusear as comportas existentes. O LOCATÁRIO será responsável por quaisquer danos decorrentes do descumprimento desta regra.",
    "",
    "11. CANCELAMENTO E ALTERAÇÃO DA DATA",
    "O sinal de 50% garante a exclusividade da data reservada e não será reembolsado em caso de cancelamento ou desistência por iniciativa do LOCATÁRIO, podendo, a critério do LOCADOR e conforme disponibilidade, ser convertido em crédito para remarcação. Se o cancelamento ocorrer por iniciativa do LOCADOR, todos os valores pagos serão restituídos integralmente.",
    "",
    "12. DISPOSIÇÕES GERAIS E ACEITE",
    "Qualquer alteração deverá ser previamente acordada entre LOCADOR e LOCATÁRIO. Este contrato poderá ser aceito por assinatura ou por manifestação expressa via WhatsApp, servindo a concordância como comprovação de ciência e aceite das condições aqui estabelecidas.",
    signatureDate(entry),
    "",
    "________________________________________\t________________________________________",
    signatures[0],
    signatures[1],
    signatures[2],
    "",
    "@balneario_igas | (93) 99160-6969 | (93) 99129-3000",
  ].join("\n");
}

export function personalizeContractText(contractText: string, entry: CalendarEntryDto): string {
  if (contractText.startsWith("CONTRATO DE RESERVA\n")) return buildContractText(entry);

  const signatures = signatureColumns(entry);
  return contractText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      if (line.startsWith("LOCATÁRIO:")) {
        return `LOCATÁRIO: ${entry.guestName || "[NOME DO LOCATÁRIO]"}, CPF: ${entry.guestCpf || "[CPF NÃO INFORMADO]"}.`;
      }
      if (line.startsWith("MODALIDADE:")) {
        return `MODALIDADE: ${entry.mode?.name.toLocaleUpperCase("pt-BR") ?? "[MODALIDADE]"}.`;
      }
      if (line.startsWith("Data da locação:")) return `Data da locação: ${reservationDate(entry)}.`;
      if (line.startsWith("Check-in:")) return `Check-in: a partir das ${checkInTime(entry)}.`;
      if (line.startsWith("Check-out:")) {
        return `Check-out: até as ${formatLocalDateTime(entry.endsAt, "HH'h'")} do dia ${checkOutDate(entry)}.`;
      }
      if (line.startsWith("O valor total da locação é de")) return paymentClause(entry);
      if (line.startsWith("Santarém/PA,")) return signatureDate(entry);
      if (line.startsWith(`${landlordName}\t`)) return signatures[0];
      if (line.startsWith("LOCADOR\tLOCATÁRIO")) return signatures[1];
      if (line.startsWith(`CPF: ${landlordCpf}\t`)) return signatures[2];
      return line;
    })
    .join("\n");
}

export function createContractPdf(
  contractText: string,
  guestName: string,
  signatures?: ContractSignatureData,
): jsPDF {
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2;
  const compactLayout = Boolean(signatures?.landlordAcceptedAt || signatures?.tenantAcceptedAt);
  const maxY = pageHeight - 12;
  const columnGap = 8;
  let y = margin + 1;

  pdf.setProperties({ title: "Contrato de locação — ÍGAS", subject: guestName });

  function ensureSpace(height: number) {
    if (y + height > maxY) {
      pdf.addPage();
      y = margin;
    }
  }

  function writeText(text: string, size: number, bold: boolean, centered = false) {
    const fontSize = size;
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(fontSize);
    const lineHeight = fontSize * (compactLayout ? 0.42 : 0.43);
    const wrapped = pdf.splitTextToSize(text, contentWidth) as string[];
    for (const wrappedLine of wrapped) {
      ensureSpace(lineHeight);
      pdf.text(wrappedLine, centered ? pageWidth / 2 : margin, y, centered ? { align: "center" } : undefined);
      y += lineHeight;
    }
    y += bold ? (compactLayout ? 1 : 1.1) : (compactLayout ? 0.75 : 0.65);
  }

  function writeInlineParts(parts: { text: string; bold: boolean }[], size = 7.5) {
    const fontSize = size;
    const lineHeight = fontSize * (compactLayout ? 0.42 : 0.43);
    let x = margin;
    ensureSpace(lineHeight);

    for (const part of parts) {
      pdf.setFont("helvetica", part.bold ? "bold" : "normal");
      pdf.setFontSize(fontSize);
      const words = part.text.match(/\s+|\S+/g) ?? [];
      for (const word of words) {
        const isWhitespace = /^\s+$/.test(word);
        const width = pdf.getTextWidth(word);
        if (isWhitespace && x === margin) continue;
        if (!isWhitespace && x + width > pageWidth - margin) {
          y += lineHeight;
          ensureSpace(lineHeight);
          x = margin;
        }
        pdf.text(word, x, y);
        x += width;
      }
    }

    y += lineHeight + (compactLayout ? 0.75 : 0.65);
  }

  function writePartyLine(label: string, name: string, cpf: string) {
    writeInlineParts([
      { text: `${label}: `, bold: false },
      { text: name, bold: true },
      { text: ", CPF: ", bold: false },
      { text: `${cpf}.`, bold: true },
    ]);
  }

  function writeEmphasizedText(text: string, terms: string[]) {
    const parts: { text: string; bold: boolean }[] = [];
    let remaining = text;

    while (remaining) {
      const next = terms
        .map((term) => ({ term, index: remaining.indexOf(term) }))
        .filter((match) => match.index >= 0)
        .sort((left, right) => left.index - right.index)[0];

      if (!next) {
        parts.push({ text: remaining, bold: false });
        break;
      }

      if (next.index > 0) parts.push({ text: remaining.slice(0, next.index), bold: false });
      parts.push({ text: next.term, bold: true });
      remaining = remaining.slice(next.index + next.term.length);
    }

    writeInlineParts(parts);
  }

  function writeColumns(line: string) {
    const [left = "", right = ""] = line.split("\t");
    const columnWidth = (contentWidth - columnGap) / 2;
    const isNameRow = left === landlordName;
    const isCpfRow = left.startsWith(`CPF: ${landlordCpf}`);
    pdf.setFont("helvetica", isNameRow ? "bold" : "normal");
    pdf.setFontSize(7.2);
    const leftLines = pdf.splitTextToSize(left, columnWidth) as string[];
    const rightLines = pdf.splitTextToSize(right, columnWidth) as string[];
    const lineHeight = 3;

    for (let index = 0; index < Math.max(leftLines.length, rightLines.length); index += 1) {
      ensureSpace(lineHeight);
      if (isCpfRow) {
        const leftCpf = leftLines[index]?.match(/^(CPF: )(.+)$/);
        const rightCpf = rightLines[index]?.match(/^(CPF: )(.+)$/);
        if (leftCpf) {
          pdf.setFont("helvetica", "normal");
          pdf.text(leftCpf[1], margin, y);
          const cpfX = margin + pdf.getTextWidth(leftCpf[1]);
          pdf.setFont("helvetica", "bold");
          pdf.text(leftCpf[2], cpfX, y);
        }
        if (rightCpf) {
          const rightX = margin + columnWidth + columnGap;
          pdf.setFont("helvetica", "normal");
          pdf.text(rightCpf[1], rightX, y);
          const cpfX = rightX + pdf.getTextWidth(rightCpf[1]);
          pdf.setFont("helvetica", "bold");
          pdf.text(rightCpf[2], cpfX, y);
        }
      } else {
        pdf.setFont("helvetica", isNameRow ? "bold" : "normal");
        if (leftLines[index]) pdf.text(leftLines[index], margin, y);
        if (rightLines[index]) pdf.text(rightLines[index], margin + columnWidth + columnGap, y);
      }
      y += lineHeight;
    }
  }

  function writeSignatureBlock(
    nameLine: string,
    labelLine: string,
    cpfLine: string,
    contactLine: string,
    signatureData?: ContractSignatureData,
  ) {
    const [leftName = "", rightName = ""] = nameLine.split("\t");
    const [leftLabel = "", rightLabel = ""] = labelLine.split("\t");
    const [leftCpf = "", rightCpf = ""] = cpfLine.split("\t");
    const columnWidth = (contentWidth - columnGap) / 2;
    const rightColumnX = margin + columnWidth + columnGap;
    const landlordStamp = signatureData?.landlordAcceptedAt
      ? {
          title: "Documento aceito eletronicamente",
          name: landlordName,
          acceptedAt: signatureData.landlordAcceptedAt,
        }
      : null;
    const tenantStamp = signatureData?.tenantAcceptedAt && signatureData.tenantAcceptedName
      ? {
          title: "Documento aceito eletronicamente",
          name: signatureData.tenantAcceptedName,
          acceptedAt: signatureData.tenantAcceptedAt,
        }
      : null;
    const landlordNameLines = landlordStamp
      ? pdf.splitTextToSize(landlordStamp.name, columnWidth - 4) as string[]
      : [];
    const tenantNameLines = tenantStamp
      ? pdf.splitTextToSize(tenantStamp.name, columnWidth - 4) as string[]
      : [];
    const landlordDateY = landlordStamp ? 6 + landlordNameLines.length * 3 + 2 : 0;
    const tenantDateY = tenantStamp ? 6 + tenantNameLines.length * 3 + 2 : 0;
    const signatureTop = landlordStamp || tenantStamp
      ? Math.max(landlordDateY, tenantDateY) + 4
      : 12;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    const leftNameLines = pdf.splitTextToSize(leftName, columnWidth - 4) as string[];
    const rightNameLines = pdf.splitTextToSize(rightName, columnWidth - 4) as string[];
    const nameLineCount = Math.max(leftNameLines.length, rightNameLines.length);
    const nameLineHeight = 3.8;
    const labelOffset = nameLineCount * nameLineHeight + 3;
    const blockHeight = signatureTop + 8 + labelOffset + 8.5 + 10 + 3;

    ensureSpace(blockHeight);
    function writeAcceptanceStamp(
      stamp: { title: string; acceptedAt: string } | null,
      nameLines: string[],
      columnX: number,
      dateY: number,
    ) {
      if (!stamp) return;
      const signatureCenter = columnX + columnWidth / 2;
      pdf.setTextColor(25, 25, 25);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text(stamp.title, signatureCenter, y + 2.5, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.text(nameLines, signatureCenter, y + 6, { align: "center" });
      pdf.setFontSize(7);
      pdf.text(
        `Data e horário: ${formatLocalDateTime(stamp.acceptedAt, "dd/MM/yyyy 'às' HH:mm")}`,
        signatureCenter,
        y + dateY,
        { align: "center" },
      );
    }
    writeAcceptanceStamp(landlordStamp, landlordNameLines, margin, landlordDateY);
    writeAcceptanceStamp(tenantStamp, tenantNameLines, rightColumnX, tenantDateY);

    const adjustedLineY = y + signatureTop;
    const adjustedNameY = adjustedLineY + 8;
    const adjustedLabelY = adjustedNameY + labelOffset;
    const adjustedCpfY = adjustedLabelY + 8.5;
    const adjustedContactY = adjustedCpfY + 10;

    pdf.setDrawColor(55, 55, 55);
    pdf.setLineWidth(0.18);
    pdf.line(margin + 2, adjustedLineY, margin + columnWidth - 2, adjustedLineY);
    pdf.line(rightColumnX + 2, adjustedLineY, rightColumnX + columnWidth - 2, adjustedLineY);

    pdf.setTextColor(25, 25, 25);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(leftNameLines, margin + columnWidth / 2, adjustedNameY, { align: "center" });
    pdf.text(rightNameLines, rightColumnX + columnWidth / 2, adjustedNameY, { align: "center" });

    pdf.setTextColor(237, 119, 32);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(leftLabel, margin + columnWidth / 2, adjustedLabelY, { align: "center" });
    pdf.text(rightLabel, rightColumnX + columnWidth / 2, adjustedLabelY, { align: "center" });

    pdf.setTextColor(25, 25, 25);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.text(leftCpf, margin + columnWidth / 2, adjustedCpfY, { align: "center" });
    pdf.text(rightCpf, rightColumnX + columnWidth / 2, adjustedCpfY, { align: "center" });

    pdf.setFontSize(7.5);
    pdf.text(contactLine, pageWidth / 2, adjustedContactY, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
    y = adjustedContactY + 4;
  }

  const lines = contractText.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^_+\t_+$/.test(line) && lines[index + 1]?.includes("\t") && lines[index + 2]?.includes("\t") && lines[index + 3]?.includes("\t")) {
      writeSignatureBlock(
        lines[index + 1],
        lines[index + 2],
        lines[index + 3],
        lines[index + 5] ?? "",
        signatures,
      );
      index += 5;
      continue;
    }

    const partyLine = /^(LOCADOR|LOCATÁRIO): (.+), CPF: (.+)\.$/.exec(line);
    if (partyLine) {
      writePartyLine(partyLine[1], partyLine[2], partyLine[3]);
      continue;
    }
    if (line.startsWith("O espaço estará disponível para acomodar")) {
      writeEmphasizedText(line, ["24 (vinte e quatro) pessoas"]);
      continue;
    }
    if (line.startsWith("Na modalidade pernoite,")) {
      writeEmphasizedText(line, ["pernoite", "2 (dois) quartos", "4 (quatro) pessoas por quarto"]);
      continue;
    }
    if (line.startsWith("O espaço também conta com uma maloca")) {
      writeEmphasizedText(line, ["maloca com capacidade para até 16 (dezesseis) redes"]);
      continue;
    }
    if (line.startsWith("Nome: ")) {
      writeEmphasizedText(line, [line.slice("Nome: ".length)]);
      continue;
    }
    if (line.startsWith("Data e horário: ")) {
      writeEmphasizedText(line, [line.slice("Data e horário: ".length)]);
      continue;
    }
    if (line.includes("\t")) {
      writeColumns(line);
      continue;
    }
    if (!line.trim()) {
      y += compactLayout ? 1.8 : 1.9;
      continue;
    }

    const isTitle = index === 0;
    const isSection = /^\d+\.\s/.test(line);
    writeText(line, isTitle ? 13 : isSection ? 8.3 : 7.5, isTitle || isSection, isTitle);
    if (isTitle) y += 8;
  }

  return pdf;
}

export function downloadContractPdf(
  contractText: string,
  guestName: string,
  signatures?: ContractSignatureData,
): void {
  const pdf = createContractPdf(contractText, guestName, signatures);
  pdf.save(`contrato-${contractFilename(guestName)}.pdf`);
}

export function downloadAcceptedContractPdf(
  contractText: string,
  guestName: string,
  signatures: ContractSignatureData,
): void {
  const pdf = createContractPdf(contractText, guestName, signatures);
  pdf.save(`contrato-aceito-${contractFilename(guestName)}.pdf`);
}

function contractFilename(guestName: string): string {
  const filename = guestName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return filename || "reserva";
}
