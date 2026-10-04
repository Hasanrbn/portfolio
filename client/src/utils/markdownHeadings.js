import remarkParse from 'remark-parse';
import { unified } from 'unified';

// Ids that already exist on every page and must not be reused by a heading.
const RESERVED_IDS = new Set(['main-content']);
// Headings listed in the table of contents. In the article body "#" is shown as a second-level
// heading (the page title is the only h1), so levels 2 and 3 are the sections and sub-sections.
const TOC_LEVELS = [2, 3];

/** Turns heading text into an id: "Why Vite? (Part 1)" becomes "why-vite-part-1". */
export function slugify(text) {
  const slug = text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

// The plain text of a markdown node (text and inline code, without the markup around them).
function nodeText(node) {
  if (typeof node.value === 'string') {
    return node.value;
  }
  return (node.children ?? []).map(nodeText).join('');
}

function visitHeadings(node, callback) {
  if (node.type === 'heading') {
    callback(node);
  }
  (node.children ?? []).forEach((child) => visitHeadings(child, callback));
}

/**
 * Gives every heading in a markdown tree a unique id (repeated titles get -2, -3, ...) and
 * returns the sections for the table of contents. The same function runs when the article is
 * drawn and when the table of contents is built, so the links always match the headings.
 */
export function addHeadingIds(tree) {
  const used = new Set(RESERVED_IDS);
  const headings = [];

  visitHeadings(tree, (node) => {
    const text = nodeText(node).trim();
    const base = slugify(text);
    let id = base;
    for (let count = 2; used.has(id); count += 1) {
      id = `${base}-${count}`;
    }
    used.add(id);
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };

    const level = Math.max(node.depth, 2);
    if (TOC_LEVELS.includes(level)) {
      headings.push({ id, level, text });
    }
  });

  return headings;
}

/** remark plugin that applies addHeadingIds while the article is rendered. */
export function remarkHeadingIds() {
  return (tree) => {
    addHeadingIds(tree);
  };
}

/** The table-of-contents entries of a markdown text. */
export function extractHeadings(markdown) {
  return addHeadingIds(unified().use(remarkParse).parse(markdown));
}
