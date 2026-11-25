import { NextResponse } from "next/server";
import { z } from "zod";
import { EntryKind, EntryStatus, UserRole } from "@/generated/prisma/client";
import { activeStatuses } from "@/lib/entries";
import { getPrisma } from "@/lib/prisma";
import { getOvernightDurationMinutes, OVERNIGHT_MAX_NIGHTS } from "@/lib/overnight";
import { localDateTimeToUtc, localDayBoundaryToUtc } from "@/lib/time";

const publicBookingSchema = z.object({
  guestName: z.string().trim().min(1, "Informe seu nome.").max(120).transform((value) => value.toLocaleUpperCase("pt-BR")),
  guestContact: z.string().trim().min(1, "Informe seu telefone ou contato.").max(160),
  guestCpf: z
    .string()
    .trim()
    .min(1, "Informe seu CPF.")
    .max(14)
    .refine((value) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value), {
      message: "Informe o CPF no formato 000.000.000-00.",
    }),
  guestAddress: z.string().trim().min(1, "Informe seu endereço.").max(300),
  modeId: z.string().min(1, "Selecione uma modalidade."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  durationDays: z.coerce.number().int().min(1, "Para pernoite, selecione pelo menos 1 noite.").max(OVERNIGHT_MAX_NIGHTS).optional(),
  notes: z.string().trim().max(2000).default(""),
});

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (
    (date && (from || to))
    || (date && !isValidDateKey(date))
    || (Boolean(from) !== Boolean(to))
    || (from && !isValidDateKey(from))
    || (to && !isValidDateKey(to))
  ) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }

  const prisma = getPrisma();
  const modes = await prisma.reservationMode.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  let occupied: Array<{ startsAt: string; endsAt: string }> = [];
  if (date || (from && to)) {
    const startKey = date ?? from;
    const startsAt = startKey ? localDayBoundaryToUtc(startKey) : new Date(Number.NaN);
    let endsAt = new Date(Number.NaN);
    if (date) {
      const nextDate = new Date(`${date}T12:00:00.000Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      endsAt = localDayBoundaryToUtc(nextDate.toISOString().slice(0, 10));
    } else if (to) {
      endsAt = localDayBoundaryToUtc(to);
    }
    if (
      !Number.isFinite(startsAt.getTime())
      || !Number.isFinite(endsAt.getTime())
      || startsAt >= endsAt
      || endsAt.getTime() - startsAt.getTime() > 45 * 86_400_000
    ) {
      return NextResponse.json({ error: "Informe um período de consulta válido." }, { status: 400 });
    }
    const entries = await prisma.calendarEntry.findMany({
      where: {
        status: { in: activeStatuses },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    });
    occupied = entries.map((entry) => ({
      startsAt: entry.startsAt.toISOString(),
      endsAt: entry.endsAt.toISOString(),
    }));
  }

  return NextResponse.json({
    modes: modes.map((mode) => ({
      id: mode.id,
      code: mode.code,
      name: mode.name,
      defaultStart: mode.defaultStart,
      durationMinutes: mode.durationMinutes,
      price: mode.code === "DAY_USE" ? 800 : mode.code === "OVERNIGHT" ? 1500 : null,
    })),
    occupied,
  });
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = publicBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const mode = await prisma.reservationMode.findFirst({
    where: { id: parsed.data.modeId, active: true },
  });
  if (!mode) {
    return NextResponse.json({ error: "Essa modalidade não está disponível." }, { status: 400 });
  }

  const startsAt = localDateTimeToUtc(`${parsed.data.date}T${mode.defaultStart}`);
  const durationDays = mode.code === "OVERNIGHT"
    ? parsed.data.durationDays ?? 0
    : 1;
  if (mode.code === "OVERNIGHT" && durationDays < 1) {
    return NextResponse.json(
      { error: "Selecione pelo menos 1 noite para o pernoite." },
      { status: 400 },
    );
  }
  const durationMinutes = mode.code === "OVERNIGHT"
    ? getOvernightDurationMinutes(durationDays, mode.defaultStart)
    : mode.durationMinutes;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  if (startsAt <= new Date()) {
    return NextResponse.json({ error: "Escolha uma data e horário futuros." }, { status: 400 });
  }

  const conflict = await prisma.calendarEntry.findFirst({
    where: {
      status: { in: activeStatuses },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  if (conflict) {
    return NextResponse.json({ error: "Esse horário já está ocupado." }, { status: 409 });
  }

  const owner = await prisma.user.findFirst({
    where: { role: UserRole.OWNER },
    orderBy: { createdAt: "asc" },
  });
  if (!owner) {
    return NextResponse.json({ error: "O agendamento não está disponível no momento." }, { status: 503 });
  }

  const entry = await prisma.calendarEntry.create({
    data: {
      kind: EntryKind.BOOKING,
      status: EntryStatus.PENDING,
      guestName: parsed.data.guestName,
      guestContact: parsed.data.guestContact,
      guestCpf: parsed.data.guestCpf || null,
      guestAddress: parsed.data.guestAddress || null,
      modeId: mode.id,
      startsAt,
      endsAt,
      totalAmount: null,
      paidAmount: null,
      notes: parsed.data.notes,
      createdById: owner.id,
    },
  });

  return NextResponse.json(
    { entryId: entry.id, message: "Agendamento solicitado com sucesso." },
    { status: 201 },
  );
}
