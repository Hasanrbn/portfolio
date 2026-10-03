import { classNames } from '../../utils/classNames.js';
import styles from './Tag.module.css';

/** Technology or topic label (for example "React", "PostgreSQL"). Badge is for status, Tag is for subject. */
export default function Tag({ className, children, ...props }) {
  return (
    <span className={classNames(styles.tag, className)} {...props}>
      {children}
    </span>
  );
}
