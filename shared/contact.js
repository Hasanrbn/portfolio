/**
 * Contact-form rules, shared by the browser (instant feedback) and the server
 * (the check that actually counts). Plain JavaScript on purpose: it has to run
 * in both places without a build step, and it keeps zod out of the client bundle.
 */

export const CONTACT_FIELDS = Object.freeze(['name', 'email', 'subject', 'message']);

export const CONTACT_LIMITS = Object.freeze({
  name: Object.freeze({ min: 1, max: 100 }),
  email: Object.freeze({ min: 3, max: 254 }),
  subject: Object.freeze({ min: 1, max: 150 }),
  message: Object.freeze({ min: 10, max: 2000 }),
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const EMAIL_LOCAL_MAX = 64;

const TAB = 0x09;
const LINE_FEED = 0x0a;

/** Characters that have no business in a name or subject (also blocks header injection). */
function hasControlCharacter(value, { allowNewlines }) {
  for (const char of value) {
    const code = char.codePointAt(0);
    const isControl = code <= 0x1f || (code >= 0x7f && code <= 0x9f);
    const isLineSeparator = code === 0x2028 || code === 0x2029;
    const isAllowed = allowNewlines && (code === LINE_FEED || code === TAB);

    if ((isControl && !isAllowed) || isLineSeparator) {
      return true;
    }
  }
  return false;
}

/** Length in characters a person would count (an emoji is 1, not 2). */
function countCharacters(value) {
  return [...value].length;
}

function clean(value, { multiline = false } = {}) {
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = multiline ? value.replace(/\r\n?/g, '\n') : value;
  return normalized.trim();
}

function checkSingleLine(value, { label, limits, emptyMessage }) {
  if (value.length === 0) {
    return emptyMessage;
  }
  if (countCharacters(value) > limits.max) {
    return `${label} must be ${limits.max} characters or fewer.`;
  }
  if (hasControlCharacter(value, { allowNewlines: false })) {
    return `${label} contains characters that are not allowed.`;
  }
  return null;
}

function checkEmail(value) {
  if (value.length === 0) {
    return 'Enter your email address.';
  }
  if (countCharacters(value) > CONTACT_LIMITS.email.max) {
    return `Email must be ${CONTACT_LIMITS.email.max} characters or fewer.`;
  }
  const localPart = value.slice(0, value.lastIndexOf('@'));
  if (!EMAIL_PATTERN.test(value) || localPart.length > EMAIL_LOCAL_MAX) {
    return 'Enter a valid email address, like name@example.com.';
  }
  return null;
}

function checkMessage(value) {
  const { min, max } = CONTACT_LIMITS.message;
  const length = countCharacters(value);

  if (length === 0) {
    return 'Enter your message.';
  }
  if (length < min) {
    return `Message must be at least ${min} characters.`;
  }
  if (length > max) {
    return `Message must be ${max} characters or fewer.`;
  }
  if (hasControlCharacter(value, { allowNewlines: true })) {
    return 'Message contains characters that are not allowed.';
  }
  return null;
}

/**
 * Validates and normalises a contact message.
 * Only the four known fields are read; anything else in `input` is ignored.
 *
 * @returns {{ ok: true, values: object } | { ok: false, errors: Record<string, string> }}
 */
export function validateContact(input) {
  const source = input !== null && typeof input === 'object' ? input : {};

  const values = {
    name: clean(source.name),
    email: clean(source.email).toLowerCase(),
    subject: clean(source.subject),
    message: clean(source.message, { multiline: true }),
  };

  const found = {
    name: checkSingleLine(values.name, {
      label: 'Name',
      limits: CONTACT_LIMITS.name,
      emptyMessage: 'Enter your name.',
    }),
    email: checkEmail(values.email),
    subject: checkSingleLine(values.subject, {
      label: 'Subject',
      limits: CONTACT_LIMITS.subject,
      emptyMessage: 'Enter a subject.',
    }),
    message: checkMessage(values.message),
  };

  const errors = Object.fromEntries(Object.entries(found).filter(([, message]) => message));

  return Object.keys(errors).length === 0 ? { ok: true, values } : { ok: false, errors };
}
