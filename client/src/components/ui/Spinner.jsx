import { classNames } from '../../utils/classNames.js';
import styles from './Spinner.module.css';

/**
 * Loading indicator. By default it announces `label` to screen readers; with reduced motion
 * the ring stops spinning, so the label is what keeps the state understandable.
 * Pass `label={null}` when a surrounding control already says it is busy (like Button does).
 */
export default function Spinner({ size = 'md', label = 'Loading', className }) {
  const ring = <span className={styles.ring} aria-hidden="true" />;

  if (label === null) {
    return <span className={classNames(styles.spinner, styles[size], className)}>{ring}</span>;
  }

  return (
    <span role="status" className={classNames(styles.spinner, styles[size], className)}>
      {ring}
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
