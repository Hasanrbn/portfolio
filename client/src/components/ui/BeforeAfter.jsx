import { useState } from 'react';
import styles from './BeforeAfter.module.css';

/**
 * Two pictures of the same size on top of each other with a divider the visitor can move:
 * left of the divider is "before", right of it is "after". The control is a real range input
 * stretched over the pictures (invisible), so dragging with a mouse or finger, the arrow keys
 * and screen readers all work with no extra script. Both pictures keep their text alternative.
 */
export default function BeforeAfter({ before, after, beforeLabel, afterLabel, caption }) {
  const [position, setPosition] = useState(50);

  let valueText = `Divider at ${position} percent`;
  if (position === 0) valueText = `Showing only ${afterLabel}`;
  if (position === 100) valueText = `Showing only ${beforeLabel}`;

  return (
    <figure className={styles.figure}>
      <div
        className={styles.frame}
        style={{
          '--position': `${position}%`,
          aspectRatio: `${before.width ?? 16} / ${before.height ?? 9}`,
        }}
      >
        <img className={styles.image} src={before.url} alt={before.alt} loading="lazy" />
        <img
          className={`${styles.image} ${styles.after}`}
          src={after.url}
          alt={after.alt}
          loading="lazy"
        />
        <span className={`${styles.tag} ${styles.tagBefore}`} aria-hidden="true">
          {beforeLabel}
        </span>
        <span className={`${styles.tag} ${styles.tagAfter}`} aria-hidden="true">
          {afterLabel}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className={styles.range}
          aria-label={`Compare: ${beforeLabel} on the left, ${afterLabel} on the right`}
          aria-valuetext={valueText}
        />
        <span className={styles.handle} aria-hidden="true">
          <span className={styles.grip}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
            </svg>
          </span>
        </span>
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
