import { classNames } from '../../utils/classNames.js';
import styles from './Badge.module.css';

/** Short status label (for example a project's "Completed"). Tone is never the only signal: keep the text meaningful. */
export default function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span className={classNames(styles.badge, styles[tone], className)} {...props}>
      {children}
    </span>
  );
}
