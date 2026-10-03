import { classNames } from '../../utils/classNames.js';
import styles from './Form.module.css';

export default function Textarea({ className, rows = 5, ...props }) {
  return (
    <textarea
      rows={rows}
      className={classNames(styles.control, styles.textarea, className)}
      {...props}
    />
  );
}
