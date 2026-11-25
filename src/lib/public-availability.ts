import { localDateTimeToUtc } from "@/lib/time";
import { getOvernightDurationMinutes } from "@/lib/overnight";

type OccupiedPeriod = {
  startsAt: string;
  endsAt: string;
};

type ReservationMode = {
  code?: string;
  defaultStart: string;
  durationMinutes: number;
};

export function isDateAvailableForMode(
  date: string,
  mode: ReservationMode,
  occupied: OccupiedPeriod[],
  durationDays = 1,
): boolean {
  const startsAt = localDateTimeToUtc(`${date}T${mode.defaultStart}`);
  const durationMinutes = mode.code === "OVERNIGHT"
    ? getOvernightDurationMinutes(durationDays, mode.defaultStart)
    : mode.durationMinutes;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return !occupied.some((period) => {
    const occupiedStart = new Date(period.startsAt);
    const occupiedEnd = new Date(period.endsAt);
    return occupiedStart < endsAt && occupiedEnd > startsAt;
  });
}
