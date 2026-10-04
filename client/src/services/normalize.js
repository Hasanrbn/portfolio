// Small helpers the services use to clean data read from the JSON files in shared/data.

export const isText = (value) => typeof value === 'string' && value.trim() !== '';

/** The trimmed string, or '' when the value is missing or not text. */
export const text = (value) => (isText(value) ? value.trim() : '');

/** The non-empty, trimmed strings of a list, or [] when the value is not a list. */
export const textList = (value) =>
  Array.isArray(value) ? value.filter(isText).map((v) => v.trim()) : [];

/** Keeps the first entry for each id and drops later repeats. */
export function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
