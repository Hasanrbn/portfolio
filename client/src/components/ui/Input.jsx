import { classNames } from '../../utils/classNames.js';
import styles from './Form.module.css';

export default function Input({ className, ...props }) {
  return <input className={classNames(styles.control, className)} {...props} />;
}
