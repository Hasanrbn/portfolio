import { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import LinkButton from '../ui/LinkButton.jsx';
import styles from './ShareButtons.module.css';

/**
 * Copy the article's address, or open LinkedIn or X with it filled in. The links are plain
 * addresses (nothing from those sites is loaded on this page). `url` is the full address.
 */
export default function ShareButtons({ title, url }) {
  const [copyState, setCopyState] = useState('idle');

  // The "copied" message disappears again after a few seconds.
  useEffect(() => {
    if (copyState === 'idle') {
      return undefined;
    }
    const timer = setTimeout(() => setCopyState('idle'), 4000);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  const address = encodeURIComponent(url);

  return (
    <section aria-labelledby="share-heading">
      <h2 id="share-heading" className={styles.heading}>
        Share this article
      </h2>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul role="list" className={styles.list}>
        <li>
          <Button variant="secondary" onClick={copyLink}>
            Copy link
          </Button>
        </li>
        <li>
          <LinkButton
            variant="secondary"
            newTab
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${address}`}
          >
            Share on LinkedIn
          </LinkButton>
        </li>
        <li>
          <LinkButton
            variant="secondary"
            newTab
            href={`https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${address}`}
          >
            Share on X
          </LinkButton>
        </li>
      </ul>
      <p role="status" className={styles.status}>
        {copyState === 'copied' && 'Link copied.'}
        {copyState === 'failed' && 'The link could not be copied. Copy it from the address bar.'}
      </p>
    </section>
  );
}
