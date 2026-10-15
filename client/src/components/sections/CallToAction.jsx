import { useId } from 'react';
import Card from '../ui/Card.jsx';
import LinkButton from '../ui/LinkButton.jsx';
import useReveal from '../../hooks/useReveal.js';
import styles from './CallToAction.module.css';

/** Closing prompt at the bottom of a page, pointing visitors to the contact page. */
export default function CallToAction() {
  const headingId = useId();
  const revealRef = useReveal();

  return (
    <Card as="section" ref={revealRef} aria-labelledby={headingId} className={styles.card}>
      <h2 id={headingId} className={styles.heading}>
        Let&apos;s work together
      </h2>
      <p className={styles.text}>
        Have a project, an opportunity or a question? I would be glad to hear from you.
      </p>
      <LinkButton to="/contact" size="lg">
        Contact Me
      </LinkButton>
    </Card>
  );
}
