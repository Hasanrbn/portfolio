import { useMemo } from 'react';
import { extractHeadings } from '../../utils/markdownHeadings.js';
import PostContent from './PostContent.jsx';
import TableOfContents from './TableOfContents.jsx';
import styles from './PostBody.module.css';

// Articles with fewer sections are short enough to read without a table of contents.
const MIN_HEADINGS_FOR_TOC = 3;

/**
 * Table of contents and article text. It is the only part of the site that needs the markdown
 * library, so the article page loads it as a separate file, on demand.
 */
export default function PostBody({ content }) {
  const headings = useMemo(() => extractHeadings(content), [content]);

  return (
    <div className={styles.body}>
      {headings.length >= MIN_HEADINGS_FOR_TOC && <TableOfContents headings={headings} />}
      <PostContent content={content} />
    </div>
  );
}
