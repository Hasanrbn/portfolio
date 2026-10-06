/**
 * Small checks used by both the browser and the server, so a value is judged the same way
 * wherever it is read. Plain JavaScript with no dependencies, because it runs in both places
 * without a build step.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
export const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** True for a URL-safe name such as "my-project-2". */
export function isSlug(value) {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
}

/**
 * Turns a name into a slug: "Node.js" becomes "node-js", "REST API" becomes "rest-api".
 * Returns '' when nothing usable is left (for example a name made only of symbols).
 */
export function slugify(name) {
  return typeof name === 'string'
    ? name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';
}

/** True for a month written as "YYYY-MM", such as "2025-03". */
export function isMonth(value) {
  return typeof value === 'string' && MONTH_PATTERN.test(value);
}

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

/** True for an https address. Other schemes, such as "javascript:" or "http:", are refused. */
export function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * True for a file served by this site, such as "/cv.pdf". Refuses "//host/file", which
 * browsers treat as another site, and backslashes, which some browsers read as slashes.
 */
export function isSitePath(value) {
  return typeof value === 'string' && /^\/(?![/\\])\S*$/.test(value);
}

/** True for a file on this site or an https address: the only addresses images and files may use. */
export function isUsableAddress(value) {
  return isSitePath(value) || (typeof value === 'string' && isHttpsUrl(value));
}

/** True when the address points to a PDF (ignoring any ?query or #fragment). */
export function isPdfAddress(address) {
  return /\.pdf$/i.test(address.split(/[?#]/)[0]);
}
