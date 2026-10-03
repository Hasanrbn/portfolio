import { classNames } from '../../utils/classNames.js';
import styles from './Form.module.css';

/** Native drop-down, which keeps keyboard and screen reader behaviour built in. Use with FormField. */
export default function Select({ className, children, ...props }) {
  return (
    <select className={classNames(styles.control, styles.select, className)} {...props}>
      {children}
    </select>
  );
}
