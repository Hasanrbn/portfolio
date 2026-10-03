import { classNames } from '../../utils/classNames.js';
import styles from './Card.module.css';

/**
 * Surface for grouped content. `as` lets callers pick the right element
 * (article for self-contained items, li inside lists, div otherwise).
 * `interactive` only adds a hover effect; make the whole card clickable with a real link inside.
 */
export default function Card({
  as: Element = 'div',
  interactive = false,
  className,
  children,
  ...props
}) {
  return (
    <Element
      className={classNames(styles.card, interactive && styles.interactive, className)}
      {...props}
    >
      {children}
    </Element>
  );
}
