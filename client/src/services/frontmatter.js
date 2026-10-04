/**
 * Splits a markdown file into its header and its text. The header sits between two "---" lines
 * and holds simple "key: value" lines (values may be wrapped in quotes; lines starting with #
 * are comments). Without a header the whole file is the text. Only plain text values are
 * supported on purpose, so no YAML library is needed.
 */
export function parseFrontmatter(raw) {
  const source = typeof raw === 'string' ? raw.replace(/^\uFEFF/, '') : '';
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(source);

  if (!match) {
    return { data: {}, body: source };
  }

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator <= 0 || line.trimStart().startsWith('#')) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (/^(['"]).*\1$/.test(value) && value.length >= 2) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }

  return { data, body: match[2] };
}
