/**
 * Internship duration, workload hours, and credit calculation engine.
 * Computes calendar duration using UTC midnight normalization, planned work hours,
 * and estimated AMK study credits (1 credit = 27 hours).
 */

export function calculateDurationWeeks(
  startDate?: string | null,
  endDate?: string | null
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const utcd1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcd2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const days = Math.floor((utcd2 - utcd1) / msPerDay) + 1;
  return Math.max(0, Math.round((days / 7) * 10) / 10);
}

export function calculateEstimatedHours(
  weeks: number,
  workloadType: string = "FULL_TIME",
  hoursPerWeek?: number | string | null
): number {
  if (weeks <= 0) return 0;
  const hpw =
    workloadType === "PART_TIME"
      ? Number(hoursPerWeek) || 0
      : 37.5;
  return Math.max(0, Math.round(weeks * hpw));
}

export interface EstimatedCreditsResult {
  credits: number;
  targetCredits: number;
  isMet: boolean;
}

export function calculateEstimatedCredits(
  totalHours: number,
  scope: string = "h1"
): EstimatedCreditsResult {
  const targetCredits = scope === "combined" ? 30.0 : 15.0;
  if (totalHours <= 0) {
    return { credits: 0, targetCredits, isMet: false };
  }
  const rawCredits = Math.round((totalHours / 27) * 10) / 10;
  const credits = Math.min(targetCredits, rawCredits);
  return {
    credits,
    targetCredits,
    isMet: rawCredits >= targetCredits,
  };
}
