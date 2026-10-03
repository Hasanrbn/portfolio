import { classNames } from '../../utils/classNames.js';
import styles from './Skeleton.module.css';

/**
 * Placeholder shown while content loads. It is decorative (aria-hidden), so the container
 * that holds skeletons should carry aria-busy="true" and a visible or visually hidden
 * loading message.
 */
export default function Skeleton({
  width = '100%',
  height = '1rem',
  radius = 'var(--radius-sm)',
  lines,
  className,
}) {
  if (lines) {
    return (
      <span className={styles.lines} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={classNames(styles.skeleton, className)}
            style={{
              width: index === lines - 1 ? '60%' : '100%',
              height,
              borderRadius: radius,
            }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      className={classNames(styles.skeleton, className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
