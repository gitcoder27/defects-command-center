export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function endOfWeekIsoDate(now = new Date()): string {
  const day = now.getDay();
  const add = 7 - day;
  const end = addDays(new Date(now), add);
  return end.toISOString().slice(0, 10);
}

export function isOlderThanHours(isoDate: string, hours: number, now = new Date()): boolean {
  const dt = new Date(isoDate);
  return dt.getTime() < now.getTime() - hours * 60 * 60 * 1000;
}
