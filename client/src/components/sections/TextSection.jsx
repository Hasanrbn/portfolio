import { useId } from 'react';
import useReveal from '../../hooks/useReveal.js';
import styles from './TextSection.module.css';

/** A titled block of text: paragraphs, a bullet list, or both (used by the About and project pages). Renders nothing when empty. */
export default function TextSection({ title, paragraphs = [], items = [] }) {
  const headingId = useId();
  const revealRef = useReveal();
  const texts = paragraphs.filter((text) => typeof text === 'string' && text.trim() !== '');
  const points = items.filter((text) => typeof text === 'string' && text.trim() !== '');

  if (texts.length === 0 && points.length === 0) {
    return null;
  }

  return (
    <section ref={revealRef} aria-labelledby={headingId} className={styles.section}>
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
