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

const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const dayFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** True for a real calendar day written as "YYYY-MM-DD" ("2025-02-30" is not one). */
export function isDate(value) {
  const match = typeof value === 'string' ? DATE_PATTERN.exec(value) : null;
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** "2025-03-09" becomes "Mar 9, 2025". Anything that is not a real day gives an empty string. */
export function formatDate(value) {
  if (!isDate(value)) {
    return '';
  }
  const [year, month, day] = value.split('-').map(Number);
  return dayFormat.format(new Date(Date.UTC(year, month - 1, day)));
}
