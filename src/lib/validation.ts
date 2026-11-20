import { z } from "zod";

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe data e horário válidos.")
  .refine((value) => {
    const date = new Date(`${value}:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value;
  }, "Informe data e horário válidos.");

const period = {
  startsAt: localDateTime,
  endsAt: localDateTime,
};

const bookingSchema = z
  .object({
    kind: z.literal("BOOKING"),
    guestName: z.string().trim().min(1, "Informe o nome do hóspede.").max(120),
    guestContact: z.string().trim().max(160).optional().default(""),
    guestCpf: z
      .string()
      .trim()
      .max(14)
      .refine((value) => !value || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value), {
        message: "Informe o CPF no formato 000.000.000-00.",
      })
      .optional()
      .default(""),
    guestAddress: z.string().trim().max(300).optional().default(""),
    modeId: z.string().min(1, "Selecione uma modalidade."),
    ...period,
    totalAmount: z.coerce.number().finite().positive("O valor total deve ser maior que zero."),
    paidAmount: z.coerce.number().finite().nonnegative("O valor pago não pode ser negativo."),
    status: z.enum(["PENDING", "CONFIRMED"]).default("PENDING"),
    notes: z.string().trim().max(2000).optional().default(""),
  })
  .refine((value) => value.paidAmount <= value.totalAmount, {
    message: "O valor pago não pode ser maior que o valor total.",
    path: ["paidAmount"],
  });

const blockSchema = z.object({
  kind: z.literal("BLOCK"),
  ...period,
  notes: z.string().trim().max(2000).optional().default(""),
});

export const entryInputSchema = z.discriminatedUnion("kind", [
  bookingSchema,
  blockSchema,
]);

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(128),
});

export const modesInputSchema = z.object({
  modes: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(80),
        defaultStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        durationMinutes: z.coerce.number().int().min(15).max(10080),
        active: z.boolean(),
      }),
    )
    .min(1)
    .max(10)
    .refine((modes) => new Set(modes.map((mode) => mode.id)).size === modes.length, {
      message: "Uma modalidade foi informada mais de uma vez.",
    }),
});

export const entryStateSchema = z
  .object({
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  })
  .refine((value) => value.status !== undefined, {
    message: "Informe uma situação para atualizar.",
  });

export const contractInputSchema = z.object({
  contractText: z.string().trim().min(1, "O contrato não pode ficar vazio.").max(20000),
});

export const contractAcceptanceInputSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome completo.").max(120),
  cpf: z
    .string()
    .trim()
    .refine((value) => /^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value), {
      message: "Informe os 11 dígitos do CPF.",
    }),
  accepted: z.boolean().refine((value) => value, "Marque a confirmação para registrar o aceite."),
});
