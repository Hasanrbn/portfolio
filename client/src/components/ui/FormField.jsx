import { useId } from 'react';
import styles from './Form.module.css';

/**
 * Label, hint and error message wired to a form control for assistive technology.
 * `children` is a function that receives the props the control needs:
 *
 *   <FormField label="Email" error={errors.email} required>
 *     {(controlProps) => <Input type="email" name="email" {...controlProps} />}
 *   </FormField>
 *
 * Error text is linked with aria-describedby, so screen readers read it when the control
 * receives focus.
 */
export default function FormField({ label, hint, error, required = false, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {children({
        id,
        required,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
