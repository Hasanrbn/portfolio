import styles from './TableOfContents.module.css';

/** Links to the sections of a long article. Renders nothing when there are no headings. */
export default function TableOfContents({ headings }) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Table of contents" className={styles.toc}>
      <p className={styles.title}>On this page</p>
      <ol className={styles.list}>
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? styles.sub : undefined}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
