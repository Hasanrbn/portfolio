import { classNames } from '../../utils/classNames.js';
import styles from './DeviceFrame.module.css';

/**
 * A laptop drawn in CSS (no image to download) with a screen the size of a 16:10 display, so a
 * screenshot reads as "this is the site, open on a computer". The body is decoration; what sits
 * in the screen (a picture) keeps its own text alternative.
 */
export function Laptop({ className, children }) {
  return (
    <div className={classNames(styles.laptop, className)} data-device="laptop">
      <div className={styles.lid}>
        <div className={styles.laptopScreen}>{children}</div>
      </div>
      <div className={styles.base} aria-hidden="true" />
    </div>
  );
}

/** The same idea as a phone, for a screenshot taken at phone width. */
export function Phone({ className, children }) {
  return (
    <div className={classNames(styles.phone, className)} data-device="phone">
      <div className={styles.phoneScreen}>{children}</div>
    </div>
  );
}
