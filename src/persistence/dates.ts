/**
 * Calendar-date helpers for Prisma `@db.Date` columns.
 * We persist and compare dates as UTC midnight so local-day strings
 * (`YYYY-MM-DD`) do not shift across timezones.
 */

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(date: string): Date {
  if (!DATE_ONLY_PATTERN.test(date)) {
    throw new Error(`Expected YYYY-MM-DD date, received: ${date}`);
  }

  return new Date(`${date}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateOnly: string, days: number): string {
  const date = parseDateOnly(dateOnly);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}
