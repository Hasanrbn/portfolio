import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import Skeleton from './Skeleton.jsx';
import styles from './AsyncView.module.css';

/**
 * Shows the right thing for the state of a request made with useAsync: a loading placeholder
 * announced to screen readers, a friendly error with a retry, an empty state, or the content.
 * `children` is only rendered (and so only evaluated) once the data has arrived.
 */
export default function AsyncView({
  status,
  onRetry,
  loadingLabel,
  errorTitle,
  isEmpty,
  empty,
  children,
}) {
  if (status === 'loading') {
    return (
      <div aria-busy="true" className={styles.loading}>
        <p role="status" className="visually-hidden">
          {loadingLabel}
        </p>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} height="6rem" radius="var(--radius-md)" />
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return <ErrorState title={errorTitle} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <EmptyState title={empty.title} description={empty.description} />;
  }

  return children();
}
