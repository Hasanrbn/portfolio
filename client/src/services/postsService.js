import { parsePostFile, readingTimeMinutes } from '@portfolio/shared/posts.js';
import { postFiles } from './postsSource.js';

// Reading the article files lives in shared/ so the server turns them into posts the same way.
export { readingTimeMinutes };

export const POSTS_PER_PAGE = 6;

/**
 * Turns post files ([{ path, raw }]) into posts. A file is skipped when its slug (the
 * `slug` header or the file name) is not URL-safe or is used twice, or when it has no title,
 * no text or no real publish date ("YYYY-MM-DD"). Newest first.
 */
export function normalizePosts(entries) {
  const seen = new Set();

  return (Array.isArray(entries) ? entries : [])
    .map((entry) => (entry && typeof entry.raw === 'string' ? parsePostFile(entry) : null))
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

/** Async on purpose: the pages already show loading and error states, so where the data comes from can change without touching them. */
export async function getPosts() {
  return normalizePosts(postFiles);
}

/** One post by slug, with its related posts, or null when there is no such post. */
export async function getPostBySlug(slug) {
  const posts = await getPosts();
  const post = posts.find((candidate) => candidate.slug === slug);
  return post ? { post, related: getRelatedPosts(post, posts) } : null;
}
