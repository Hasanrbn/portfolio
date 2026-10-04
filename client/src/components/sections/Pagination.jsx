import { Link } from 'react-router';
import styles from './Pagination.module.css';

/**
 * Previous / next links with "Page 2 of 5". `getSearch(page)` gives the address query for a
 * page, so other filters in the address are kept. Renders nothing when there is one page.
 */
export default function Pagination({ page, pageCount, getSearch }) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className={styles.nav}>
      {page > 1 ? (
        <Link to={{ search: getSearch(page - 1) }} rel="prev" className={styles.link}>
          Previous<span className="visually-hidden"> page</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={styles.placeholder} />
      )}
      <p className={styles.status}>
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link to={{ search: getSearch(page + 1) }} rel="next" className={styles.link}>
          Next<span className="visually-hidden"> page</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={styles.placeholder} />
      )}
    </nav>
  );
}
