import { classNames } from '../../utils/classNames.js';
import Spinner from './Spinner.jsx';
import styles from './Button.module.css';

/** Class names shared by Button and LinkButton so both look identical. */
export function buttonClassName({ variant = 'primary', size = 'md', className } = {}) {
  return classNames(styles.button, styles[variant], size === 'lg' && styles.large, className);
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" label={null} />}
      {children}
    </button>
  );
}
