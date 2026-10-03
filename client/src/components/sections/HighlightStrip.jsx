import { useId } from 'react';
import Tag from '../ui/Tag.jsx';
import styles from './HighlightStrip.module.css';

/** A short list of the main technologies. Renders nothing when the list is empty. */
export default function HighlightStrip({ technologies = [] }) {
  const headingId = useId();
  const items = technologies.filter((item) => typeof item === 'string' && item.trim() !== '');

  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Core technologies
      </h2>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul role="list" className={styles.list}>
        {items.map((item) => (
          <li key={item}>
            <Tag>{item}</Tag>
          </li>
        ))}
      </ul>
    </section>
  );
}
