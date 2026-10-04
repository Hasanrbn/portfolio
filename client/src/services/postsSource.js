// Every markdown file in shared/data/posts becomes part of the built site, so that folder
// holds published articles only. Unfinished writing belongs somewhere else (for example
// shared/data/drafts, which is not read). Vite finds the files at build time.
const files = import.meta.glob('../../../shared/data/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** The raw post files as [{ path, raw }]. */
export const postFiles = Object.entries(files).map(([path, raw]) => ({ path, raw }));
