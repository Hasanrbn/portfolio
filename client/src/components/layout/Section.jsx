import { classNames } from '../../utils/classNames.js';
import styles from './Section.module.css';

/**
 * One section of the single-page site. The `id` is the address (`/#about`) the menu and the
 * links point to; the heading is the section's h2 and is what keyboard focus moves to after the
 * menu scrolls here. Everything below it in the section uses h3 or deeper.
 */
export default function Section({ id, title, lead, className, children }) {
  const headingId = `${id}-heading`;

  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <div className={classNames('container', className)}>
        <div className={styles.head}>
          <h2 id={headingId} tabIndex={-1} className={styles.title}>
            {title}
          </h2>
          {lead && <p className={styles.lead}>{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
