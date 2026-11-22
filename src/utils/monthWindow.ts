import type { BillingMonthOption } from '../types/models';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatMonthKey(year: number, monthIndex: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${mm}`;
}

/**
 * Returns the rolling last 3 months up to `referenceDate` (default: today).
 * Strictly prevents selecting future/advance months.
 */
export function getRollingThreeMonths(
  referenceDate: Date = new Date()
): BillingMonthOption[] {
  const result: BillingMonthOption[] = [];
  const baseYear = referenceDate.getFullYear();
  const baseMonth = referenceDate.getMonth();

  for (let offset = 2; offset >= 0; offset--) {
    const d = new Date(baseYear, baseMonth - offset, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    result.push({
      key: formatMonthKey(year, monthIndex),
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      year,
      monthIndex,
    });
  }

  return result;
}

export function isFutureMonthKey(
  monthKey: string,
  referenceDate: Date = new Date()
): boolean {
  const currentKey = formatMonthKey(
    referenceDate.getFullYear(),
    referenceDate.getMonth()
  );
  return monthKey > currentKey;
}