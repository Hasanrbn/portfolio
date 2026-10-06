import { MONTH_PATTERN, isDate, isMonth } from '@portfolio/shared/validation.js';

// The checks live in shared/ so the server judges dates exactly as the site does.
export { isDate, isMonth };

const monthFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2025-03" becomes "Mar 2025". Anything else gives an empty string. */
export function formatMonth(value) {
  const match = typeof value === 'string' ? MONTH_PATTERN.exec(value) : null;
  if (!match) {
    return '';
  }
  return monthFormat.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
}

const dayFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2025-03-09" becomes "Mar 9, 2025". Anything that is not a real day gives an empty string. */
export function formatDate(value) {
  if (!isDate(value)) {
    return '';
  }
  const [year, month, day] = value.split('-').map(Number);
  return dayFormat.format(new Date(Date.UTC(year, month - 1, day)));
}
