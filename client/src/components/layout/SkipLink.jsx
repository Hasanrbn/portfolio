import styles from './SkipLink.module.css';

/**
 * First focusable element on every page: lets keyboard and screen reader users jump past
 * the header navigation. Focus is moved to <main> directly instead of relying on the #hash,
 * which the client-side router would otherwise treat as a navigation.
 */
export default function SkipLink() {
  function handleClick(event) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }

  return (
    <a href="#main-content" className={styles.skipLink} onClick={handleClick}>
      Skip to main content
    </a>
  );
}
