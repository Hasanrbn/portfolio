import { useId } from 'react';
import styles from './AboutSection.module.css';

/** A titled block of the About page: paragraphs, a bullet list, or both. Renders nothing when empty. */
export default function AboutSection({ title, paragraphs = [], items = [] }) {
  const headingId = useId();
  const texts = paragraphs.filter((text) => typeof text === 'string' && text.trim() !== '');
  const points = items.filter((text) => typeof text === 'string' && text.trim() !== '');

  if (texts.length === 0 && points.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId} className={styles.heading}>
        {title}
      </h2>
      {texts.map((text) => (
        <p key={text}>{text}</p>
      ))}
      {points.length > 0 && (
        <ul className={styles.list}>
          {points.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
