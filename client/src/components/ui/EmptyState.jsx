import { classNames } from '../../utils/classNames.js';
import styles from './State.module.css';

/**
 * Shown when a list has nothing to display yet. `headingAs` keeps the page's heading
 * levels in order (use h2 under the page's h1, h3 under an h2 section, and so on).
 */
export default function EmptyState({
  title,
  description,
  action,
  headingAs: Heading = 'h2',
  className,
}) {
  return (
    <div className={classNames(styles.state, className)}>
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
