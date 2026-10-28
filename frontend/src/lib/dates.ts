/**
 * Formats an ISO date string (yyyy-mm-dd) in the Finnish style, e.g. "1.6.2026".
 * Returns "" for empty or malformed input.
 */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${Number(day)}.${Number(month)}.${year}`;
}

/**
 * Formats a start/end pair as a period, e.g. "1.6.2026 – 30.11.2026".
 * Returns "" when both are empty.
 */
export function formatPeriod(startIso: string, endIso: string): string {
  const start = formatDate(startIso);
  const end = formatDate(endIso);
  if (!start && !end) return "";
  return `${start} – ${end}`.trim();
}
