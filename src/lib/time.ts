import { ptBR } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TIME_ZONE = "America/Sao_Paulo";

export function localDateTimeToUtc(value: string): Date {
  return fromZonedTime(value, TIME_ZONE);
}

export function localDayBoundaryToUtc(value: string): Date {
  return fromZonedTime(`${value}T00:00:00`, TIME_ZONE);
}

export function formatLocalDateTime(value: Date | string, pattern: string): string {
  return formatInTimeZone(value, TIME_ZONE, pattern, { locale: ptBR });
}

export function getReservationDateKeys(
  startsAt: Date | string,
  endsAt: Date | string,
  modeCode?: string,
): string[] {
  const firstDay = formatLocalDateTime(startsAt, "yyyy-MM-dd");
  let lastDay = formatLocalDateTime(endsAt, "yyyy-MM-dd");
  if (modeCode === "OVERNIGHT" && lastDay > firstDay) {
    const checkoutDate = new Date(`${lastDay}T12:00:00.000Z`);
    checkoutDate.setUTCDate(checkoutDate.getUTCDate() - 1);
    lastDay = checkoutDate.toISOString().slice(0, 10);
  }
  if (firstDay > lastDay) return [];

  const date = new Date(`${firstDay}T12:00:00.000Z`);
  const lastDate = new Date(`${lastDay}T12:00:00.000Z`);
  const days: string[] = [];
  while (date <= lastDate) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

export function formatLocalDateKey(value: string): string {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

export function toDateTimeInput(value: Date | string): string {
  return formatLocalDateTime(value, "yyyy-MM-dd'T'HH:mm");
}
