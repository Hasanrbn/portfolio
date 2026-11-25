import { classNames } from '../../utils/classNames.js';
import styles from './BrowserFrame.module.css';

/**
 * A picture of a screen set inside a simple browser window, so a screenshot reads as "this is
 * the app" and not as a loose image. The bar is decoration only; `address` is shown in it as
 * plain text (the real link is a button elsewhere).
 */
export default function BrowserFrame({ address, className, children }) {
  return (
    <div className={classNames(styles.frame, className)}>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        {address && <span className={styles.address}>{address}</span>}
      </div>
      <div className={styles.screen}>{children}</div>
    </div>
  );
}
