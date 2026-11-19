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

export function toDateTimeInput(value: Date | string): string {
  return formatLocalDateTime(value, "yyyy-MM-dd'T'HH:mm");
}
