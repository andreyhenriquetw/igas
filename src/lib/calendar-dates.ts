export function changeKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monthBounds(key: string) {
  const [year, month] = key.slice(0, 7).split("-").map(Number);
  const first = `${key.slice(0, 7)}-01`;
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const firstWeekday = new Date(`${first}T12:00:00.000Z`).getUTCDay();
  const gridStart = changeKey(first, -firstWeekday);
  const daysInMonth = Number(last.slice(8, 10));
  const gridDays = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  return { first, last, gridStart, gridDays };
}

export function getWeekStart(key: string) {
  const weekday = new Date(`${key}T12:00:00.000Z`).getUTCDay();
  return changeKey(key, -weekday);
}
