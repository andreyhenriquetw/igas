import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

export function apiError(error: unknown): NextResponse {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "O conteúdo enviado não é válido." }, { status: 400 });
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Você não tem permissão para esta ação." }, { status: 403 });
  }
  if (error instanceof Error && error.message === "INVALID_PERIOD") {
    return NextResponse.json({ error: "O período informado é inválido." }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }
    if (
      error.code === "P2004" &&
      String(error.meta?.database_error ?? error.message).includes("CalendarEntry_no_active_overlap")
    ) {
      return NextResponse.json(
        { error: "Esse horário acabou de ser ocupado. Atualize a agenda e escolha outro período." },
        { status: 409 },
      );
    }
  }
  if (error instanceof Error && (error.message.includes("23P01") || error.message.includes("CalendarEntry_no_active_overlap"))) {
    return NextResponse.json(
      { error: "Esse horário já está ocupado. Escolha outro período." },
      { status: 409 },
    );
  }

  console.error("Falha na API da agenda:", error);
  return NextResponse.json(
    { error: "Não foi possível concluir a operação. Tente novamente." },
    { status: 500 },
  );
}

export function validationError(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
