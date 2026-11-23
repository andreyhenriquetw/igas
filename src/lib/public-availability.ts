import { localDateTimeToUtc } from "@/lib/time";

type OccupiedPeriod = {
  startsAt: string;
  endsAt: string;
};

type ReservationMode = {
  defaultStart: string;
  durationMinutes: number;
};

export function isDateAvailableForMode(
  date: string,
  mode: ReservationMode,
  occupied: OccupiedPeriod[],
): boolean {
  const startsAt = localDateTimeToUtc(`${date}T${mode.defaultStart}`);
  const endsAt = new Date(startsAt.getTime() + mode.durationMinutes * 60_000);
  return !occupied.some((period) => {
    const occupiedStart = new Date(period.startsAt);
    const occupiedEnd = new Date(period.endsAt);
    return occupiedStart < endsAt && occupiedEnd > startsAt;
  });
}
