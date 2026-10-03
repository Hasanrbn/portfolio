/** Joins class names, skipping falsy values. */
export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}
