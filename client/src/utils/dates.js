const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const monthFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** True for a month written as "YYYY-MM", such as "2025-03". */
export function isMonth(value) {
  return typeof value === 'string' && MONTH_PATTERN.test(value);
}

/** "2025-03" becomes "Mar 2025". Anything else gives an empty string. */
export function formatMonth(value) {
  const match = typeof value === 'string' ? MONTH_PATTERN.exec(value) : null;
  if (!match) {
    return '';
  }
  return monthFormat.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
}
