import { classNames } from '../../utils/classNames.js';
import Button from './Button.jsx';
import styles from './State.module.css';

/** Friendly failure message with an optional retry. Never show raw error text from the server or runtime here. */
export default function ErrorState({
  title = 'Something went wrong.',
  description = 'Please try again in a moment.',
  onRetry,
  headingAs: Heading = 'h2',
  className,
}) {
  return (
    <div role="alert" className={classNames(styles.state, styles.error, className)}>
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {onRetry && (
        <div className={styles.action}>
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
