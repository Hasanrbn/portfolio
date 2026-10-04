import { isDate } from '../utils/dates.js';
import { getImageSource } from '../utils/profile.js';
import { parseFrontmatter } from './frontmatter.js';
import { postFiles } from './postsSource.js';
import { isText, text } from './normalize.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORDS_PER_MINUTE = 200;

export const POSTS_PER_PAGE = 6;

function slugFromPath(path) {
  return path.split('/').pop().replace(/\.md$/i, '');
}

function parseTags(value) {
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

function parsePost({ path, raw }) {
  const { data, body } = parseFrontmatter(raw);
  const slug = isText(data.slug) ? data.slug.trim() : slugFromPath(path);
  const title = text(data.title);
  const content = body.trim();

  if (!SLUG_PATTERN.test(slug) || !title || !content || !isDate(data.publishedAt)) {
    return null;
  }

  const cover = getImageSource(data.coverImage);

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

/**
 * Turns post files ([{ path, raw }]) into posts. A file is skipped when its slug (the
 * `slug` header or the file name) is not URL-safe or is used twice, or when it has no title,
 * no text or no real publish date ("YYYY-MM-DD"). Newest first. The shape matches
 * GET /api/posts in Phase 15.
 */
export function normalizePosts(entries) {
  const seen = new Set();

  return (Array.isArray(entries) ? entries : [])
    .map((entry) => (entry && typeof entry.raw === 'string' ? parsePost(entry) : null))
    .filter((post) => post && !seen.has(post.slug) && seen.add(post.slug))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
}

/** Posts matching a search text, a category and a tag (all optional, all must match). */
export function filterPosts(posts, { q = '', category = '', tag = '' } = {}) {
  const query = q.trim().toLowerCase();

  return posts.filter((post) => {
    if (category && post.category !== category) return false;
    if (tag && !post.tags.includes(tag)) return false;
    if (!query) return true;
    return [post.title, post.excerpt, post.category, post.content, ...post.tags].some((value) =>
      value.toLowerCase().includes(query),
    );
  });
}

/** The categories and tags that exist, sorted, for the filter menus. */
export function getPostFilterOptions(posts) {
  const unique = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en'));

  return {
    categories: unique(posts.map((post) => post.category)),
    tags: unique(posts.flatMap((post) => post.tags)),
  };
}

/** One page of a list. An out-of-range page number is moved to the nearest real page. */
export function paginate(items, page, pageSize = POSTS_PER_PAGE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Number.isInteger(page) ? page : 1), pageCount);

  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageCount,
  };
}

/**
 * Other posts that share tags (worth two points each) or the category (one point) with this
 * one, best match first, then newest. Posts with nothing in common are not related.
 */
export function getRelatedPosts(post, posts, limit = 3) {
  const score = (other) =>
    other.tags.filter((tag) => post.tags.includes(tag)).length * 2 +
    (post.category && other.category === post.category ? 1 : 0);

  return posts
    .filter((other) => other.slug !== post.slug)
    .map((other) => ({ other, points: score(other) }))
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points || b.other.publishedAt.localeCompare(a.other.publishedAt))
    .slice(0, limit)
    .map(({ other }) => other);
}

/** Async on purpose: only these two functions change when the API replaces the files (Phase 15). */
export async function getPosts() {
  return normalizePosts(postFiles);
}

/** One post by slug, with its related posts, or null when there is no such post. */
export async function getPostBySlug(slug) {
  const posts = await getPosts();
  const post = posts.find((candidate) => candidate.slug === slug);
  return post ? { post, related: getRelatedPosts(post, posts) } : null;
}
