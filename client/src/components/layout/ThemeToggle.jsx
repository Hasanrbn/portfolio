import Icon from '../ui/Icon.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { classNames } from '../../utils/classNames.js';
import styles from './ThemeToggle.module.css';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

/**
 * Three-way theme switch: light, dark, or follow the operating system.
 * `compact` always shows icons only (the names stay available to screen readers).
 */
export default function ThemeToggle({ compact = false }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={classNames(styles.group, compact && styles.compact)}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={preference === option.value}
          aria-label={option.label}
          onClick={() => setPreference(option.value)}
        >
          <Icon name={option.icon} size={18} />
          <span className={styles.label} aria-hidden="true">
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
