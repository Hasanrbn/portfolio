import { useEffect, useRef, useState } from 'react';
import { CONTACT_FIELDS, CONTACT_LIMITS, validateContact } from '@portfolio/shared/contact.js';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import { CONTACT_SUCCESS_MESSAGE, sendContactMessage } from '../../services/contactService.js';
import styles from './ContactForm.module.css';

// Hidden field that people never see but simple bots fill in. The server drops those messages.
const HONEYPOT_FIELD = 'website';

// After this long without an answer the form explains that the server may be waking up.
const SLOW_SEND_MS = 6000;

const EMPTY_VALUES = { name: '', email: '', subject: '', message: '', [HONEYPOT_FIELD]: '' };

/**
 * Contact form. The checks here only give quick feedback; the server repeats them.
 *
 * - Errors sit next to their field (linked with aria-describedby) and focus moves to the
 *   first field that needs attention, so keyboard and screen reader users land on the problem.
 * - Success and failure are announced through live regions and the form keeps what the visitor
 *   typed when sending fails.
 * - `send` is injectable so tests (and later the API client) can replace the network call.
 */
export default function ContactForm({ send = sendContactMessage }) {
  const formRef = useRef(null);
  const sendingRef = useRef(false);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | failed
  const [failure, setFailure] = useState('');

  const sending = status === 'sending';
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!sending) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_SEND_MS);
    return () => clearTimeout(timer);
  }, [sending]);

  function focusFirstInvalid(fieldErrors) {
    const first = CONTACT_FIELDS.find((field) => fieldErrors[field]);
    if (first) {
      formRef.current?.elements.namedItem(first)?.focus();
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...values, [name]: value };
    setValues(next);

    if (status === 'sent' || status === 'failed') {
      setStatus('idle');
    }
    // Once a field has been flagged, re-check it while the visitor fixes it.
    if (errors[name]) {
      const result = validateContact(next);
      setErrors((current) => ({ ...current, [name]: result.ok ? undefined : result.errors[name] }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sendingRef.current) {
      return;
    }

    const result = validateContact(values);
    if (!result.ok) {
      setErrors(result.errors);
      setStatus('idle');
      focusFirstInvalid(result.errors);
      return;
    }

    setErrors({});
    setStatus('sending');
    sendingRef.current = true;

    const outcome = await send({ ...result.values, [HONEYPOT_FIELD]: values[HONEYPOT_FIELD] });
    sendingRef.current = false;

    if (outcome.ok) {
      setValues(EMPTY_VALUES);
      setStatus('sent');
      return;
    }

    if (outcome.kind === 'validation') {
      setErrors(outcome.fieldErrors);
      setStatus('idle');
      focusFirstInvalid(outcome.fieldErrors);
      return;
    }

    setFailure(outcome.message);
    setStatus('failed');
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className={styles.form}>
      <p className={styles.note}>
        Fields marked <span aria-hidden="true">*</span>
        <span className="visually-hidden">with an asterisk</span> are required.
      </p>

      <FormField label="Name" error={errors.name} required>
        {(controlProps) => (
          <Input
            {...controlProps}
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={handleChange}
          />
        )}
      </FormField>

      <FormField label="Email" error={errors.email} required>
        {(controlProps) => (
          <Input
            {...controlProps}
            type="email"
            name="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
          />
        )}
      </FormField>

      <FormField label="Subject" error={errors.subject} required>
        {(controlProps) => (
          <Input {...controlProps} name="subject" value={values.subject} onChange={handleChange} />
        )}
      </FormField>

      <FormField
        label="Message"
        hint={`Between ${CONTACT_LIMITS.message.min} and ${CONTACT_LIMITS.message.max} characters.`}
        error={errors.message}
        required
      >
        {(controlProps) => (
          <Textarea
            {...controlProps}
            name="message"
            rows={7}
            value={values.message}
            onChange={handleChange}
          />
        )}
      </FormField>

      {/* Not for people: out of sight, out of the tab order and hidden from screen readers. */}
      <div className={styles.trap} aria-hidden="true">
        <label>
          Leave this field empty
          <input
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
            value={values[HONEYPOT_FIELD]}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <Button type="submit" loading={sending}>
          {sending ? 'Sending…' : 'Send message'}
        </Button>
      </div>

      {/* The region exists before its text does, which is what makes screen readers announce it. */}
      <div role="status" className={styles.feedback}>
        {sending && slow && (
          <p className={styles.waiting}>
            The server is waking up after being idle. This can take a little while; please keep this
            page open.
          </p>
        )}
        {status === 'sent' && <p className={styles.success}>{CONTACT_SUCCESS_MESSAGE}</p>}
      </div>
      {status === 'failed' && (
        <div role="alert" className={styles.feedback}>
          <p className={styles.failure}>{failure}</p>
        </div>
      )}
    </form>
  );
}
