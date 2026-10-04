import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../src/services/frontmatter.js';
import {
  POSTS_PER_PAGE,
  filterPosts,
  getPostFilterOptions,
  getRelatedPosts,
  normalizePosts,
  paginate,
  readingTimeMinutes,
} from '../src/services/postsService.js';
import { extractHeadings, slugify } from '../src/utils/markdownHeadings.js';
import { formatDate, isDate } from '../src/utils/dates.js';

const file = (name, meta = {}, body = 'Some text.') => {
  const header = Object.entries({ title: 'A title', publishedAt: '2025-03-01', ...meta })
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  return { path: `/shared/data/posts/${name}.md`, raw: `---\n${header}\n---\n${body}` };
};

describe('parseFrontmatter', () => {
  it('reads key: value lines, quotes and comments, and returns the text', () => {
    const { data, body } = parseFrontmatter(
      '---\ntitle: "Why: a test"\n# a comment\ntags: a, b\nempty:\n---\nHello\n\nWorld',
    );

    expect(data).toEqual({ title: 'Why: a test', tags: 'a, b', empty: '' });
    expect(body).toBe('Hello\n\nWorld');
  });

  it('treats a file without a header as all text, and copes with Windows line endings and a BOM', () => {
    expect(parseFrontmatter('Just text')).toEqual({ data: {}, body: 'Just text' });
    expect(parseFrontmatter('﻿---\r\ntitle: Hi\r\n---\r\nBody').data.title).toBe('Hi');
    expect(parseFrontmatter(undefined)).toEqual({ data: {}, body: '' });
  });

  it('does not mistake a --- rule inside the text for the end of a missing header', () => {
    const { data, body } = parseFrontmatter('Intro\n\n---\n\nMore');

    expect(data).toEqual({});
    expect(body).toBe('Intro\n\n---\n\nMore');
  });
});

describe('normalizePosts', () => {
  it('builds a post from a file, using the file name as the slug', () => {
    const [post] = normalizePosts([
      file('my-first-post', {
        excerpt: 'Short.',
        category: 'Web',
        tags: 'React, Vite , react,',
        updatedAt: '2025-04-01',
      }),
    ]);

    expect(post).toMatchObject({
      slug: 'my-first-post',
      title: 'A title',
      excerpt: 'Short.',
      category: 'Web',
      tags: ['React', 'Vite'],
      publishedAt: '2025-03-01',
      updatedAt: '2025-04-01',
      readingTime: 1,
      cover: null,
    });
  });

  it('prefers a slug written in the header', () => {
    const [post] = normalizePosts([file('file-name', { slug: 'chosen-slug' })]);

    expect(post.slug).toBe('chosen-slug');
  });

  it('skips files that are not usable: bad or repeated slug, no title, no text, no real date', () => {
    const result = normalizePosts([
      file('ok'),
      file('Bad Name'),
      file('ok', { title: 'Same slug again' }),
      file('no-title', { title: undefined }),
      file('empty-body', {}, '   '),
      file('bad-date', { publishedAt: '2025-02-30' }),
      file('no-date', { publishedAt: undefined }),
      { path: '/x/not-text.md', raw: 42 },
      null,
    ]);

    expect(result.map((post) => post.slug)).toEqual(['ok']);
  });

  it('ignores an update date that is before the publish date', () => {
    const [post] = normalizePosts([file('a', { updatedAt: '2024-01-01' })]);

    expect(post.updatedAt).toBeNull();
  });

  it('keeps only cover addresses that are safe, and gives the picture a text alternative', () => {
    const [unsafe, safe, described] = normalizePosts([
      file('a', { coverImage: 'javascript:alert(1)' }),
      file('b', { coverImage: '/images/cover.png', publishedAt: '2025-03-02' }),
      file('c', { coverImage: '/images/c.png', coverAlt: 'A cat', publishedAt: '2025-03-03' }),
    ]).reverse();

    expect(unsafe.cover).toBeNull();
    expect(safe.cover).toEqual({ url: '/images/cover.png', alt: 'Cover image for A title' });
    expect(described.cover.alt).toBe('A cat');
  });

  it('puts the newest first and copes with malformed input', () => {
    const result = normalizePosts([
      file('old', { publishedAt: '2024-01-01' }),
      file('new', { publishedAt: '2025-06-01' }),
    ]);

    expect(result.map((post) => post.slug)).toEqual(['new', 'old']);
    expect(normalizePosts(undefined)).toEqual([]);
  });
});

describe('readingTimeMinutes', () => {
  it('rounds up at 200 words a minute and is never below one', () => {
    expect(readingTimeMinutes('')).toBe(1);
    expect(readingTimeMinutes('word '.repeat(200))).toBe(1);
    expect(readingTimeMinutes('word '.repeat(201))).toBe(2);
    expect(readingTimeMinutes('word '.repeat(1000))).toBe(5);
  });
});

describe('filtering, options, pages and related posts', () => {
  const posts = normalizePosts([
    file(
      'a',
      {
        title: 'React hooks',
        category: 'Web',
        tags: 'React, JavaScript',
        publishedAt: '2025-05-01',
      },
      'About useState.',
    ),
    file('b', {
      title: 'Express tips',
      category: 'Web',
      tags: 'Express, JavaScript',
      publishedAt: '2025-04-01',
    }),
    file('c', {
      title: 'Linux notes',
      category: 'Tools',
      tags: 'Linux',
      publishedAt: '2025-03-01',
    }),
    file('d', {
      title: 'Another React post',
      category: 'Tools',
      tags: 'React',
      publishedAt: '2025-02-01',
    }),
  ]);

  it('searches title, tags and text, and every filter must match', () => {
    expect(filterPosts(posts, { q: 'react' }).map((p) => p.slug)).toEqual(['a', 'd']);
    expect(filterPosts(posts, { q: 'usestate' }).map((p) => p.slug)).toEqual(['a']);
    expect(filterPosts(posts, { category: 'Web', tag: 'Express' }).map((p) => p.slug)).toEqual([
      'b',
    ]);
    expect(filterPosts(posts, { category: 'Tools', tag: 'Express' })).toEqual([]);
    expect(filterPosts(posts)).toHaveLength(4);
  });

  it('lists each category and tag once, sorted', () => {
    expect(getPostFilterOptions(posts)).toEqual({
      categories: ['Tools', 'Web'],
      tags: ['Express', 'JavaScript', 'Linux', 'React'],
    });
  });

  it('paginates and moves an out-of-range page to the nearest real one', () => {
    const items = Array.from({ length: 13 }, (_, index) => index);

    expect(POSTS_PER_PAGE).toBe(6);
    expect(paginate(items, 1)).toEqual({ items: [0, 1, 2, 3, 4, 5], page: 1, pageCount: 3 });
    expect(paginate(items, 3).items).toEqual([12]);
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 0).page).toBe(1);
    expect(paginate(items, 'x').page).toBe(1);
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1 });
  });

  it('relates posts by shared tags first, then category, and leaves out unrelated ones', () => {
    const [a] = posts;

    expect(getRelatedPosts(a, posts).map((p) => p.slug)).toEqual(['b', 'd']);
    expect(getRelatedPosts(a, posts, 1).map((p) => p.slug)).toEqual(['b']);
    const linux = posts.find((p) => p.slug === 'c');
    expect(getRelatedPosts(linux, posts).map((p) => p.slug)).toEqual(['d']);
  });
});

describe('markdown headings', () => {
  it('makes readable ids and never an empty one', () => {
    expect(slugify('Why Vite? (Part 1)')).toBe('why-vite-part-1');
    expect(slugify('Café déjà vu')).toBe('cafe-deja-vu');
    expect(slugify('???')).toBe('section');
  });

  it('lists second and third level sections, with unique ids for repeated titles', () => {
    const headings = extractHeadings(
      '# Title\n\n## Setup\n\ntext\n\n### Install\n\n## Setup\n\n#### Too deep\n\n```\n## not a heading\n```',
    );

    expect(headings).toEqual([
      { id: 'title', level: 2, text: 'Title' },
      { id: 'setup', level: 2, text: 'Setup' },
      { id: 'install', level: 3, text: 'Install' },
      { id: 'setup-2', level: 2, text: 'Setup' },
    ]);
  });

  it('never uses an id that already exists on every page', () => {
    expect(extractHeadings('## Main content')[0].id).toBe('main-content-2');
  });
});

describe('dates', () => {
  it('accepts only real calendar days and formats them in English', () => {
    expect(isDate('2025-02-28')).toBe(true);
    expect(isDate('2024-02-29')).toBe(true);
    expect(isDate('2025-02-30')).toBe(false);
    expect(isDate('2025-2-3')).toBe(false);
    expect(formatDate('2025-03-09')).toBe('Mar 9, 2025');
    expect(formatDate('nope')).toBe('');
  });
});
