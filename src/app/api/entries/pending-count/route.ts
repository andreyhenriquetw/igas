import { NextResponse } from "next/server";
import { EntryKind, EntryStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-error";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireUser();
    const count = await getPrisma().calendarEntry.count({
      where: {
        kind: EntryKind.BOOKING,
        status: EntryStatus.PENDING,
      },
    });
    return NextResponse.json({ count });
  } catch (error) {
    return apiError(error);
  }
}
