/** Splits plain text into paragraphs at blank lines. Missing or non-text input gives an empty list. */
export function splitParagraphs(text) {
  if (typeof text !== 'string') {
    return [];
  }
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
