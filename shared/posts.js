import { parseFrontmatter } from './frontmatter.js';
import { isDate, isSlug, isUsableAddress } from './validation.js';

const WORDS_PER_MINUTE = 200;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const text = (value) => (isText(value) ? value.trim() : '');

function slugFromPath(path) {
  return path.split('/').pop().replace(/\.md$/i, '');
}

/** "react, node, React" becomes ["react", "node"]: trimmed, no blanks, no repeats ignoring case. */
export function parseTags(value) {
  const seen = new Set();
  return (typeof value === 'string' ? value.split(',') : [])
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Minutes to read a text, at 200 words a minute, never less than one. */
export function readingTimeMinutes(body) {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/**
 * Turns one markdown file ({ path, raw }) into a post, or null when the file is not a valid
 * post (slug not URL-safe, no title, no text, or no real publish date "YYYY-MM-DD").
 * The slug is the `slug` header or the file name.
 */
export function parsePostFile({ path, raw }) {
  const { data, body } = parseFrontmatter(raw);
  const slug = isText(data.slug) ? data.slug.trim() : slugFromPath(path);
  const title = text(data.title);
  const content = body.trim();

  if (!isSlug(slug) || !title || !content || !isDate(data.publishedAt)) {
    return null;
  }

  const cover = isUsableAddress(data.coverImage) ? data.coverImage : null;

  return {
    slug,
    title,
    excerpt: text(data.excerpt),
    content,
    category: text(data.category),
    tags: parseTags(data.tags),
    publishedAt: data.publishedAt,
    // An update date before the publish date is a typing mistake, so it is ignored.
    updatedAt: isDate(data.updatedAt) && data.updatedAt >= data.publishedAt ? data.updatedAt : null,
    cover: cover ? { url: cover, alt: text(data.coverAlt) || `Cover image for ${title}` } : null,
    readingTime: readingTimeMinutes(content),
  };
}
