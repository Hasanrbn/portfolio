import { describe, expect, it } from 'vitest';
import { CONTACT_LIMITS, validateContact } from '@portfolio/shared/contact.js';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'I would like to talk about a project.',
};

function errorsFor(overrides) {
  const result = validateContact({ ...valid, ...overrides });
  return result.ok ? {} : result.errors;
}

describe('validateContact', () => {
  it('accepts a complete message and returns trimmed values', () => {
    const result = validateContact({
      name: '  Ada Lovelace  ',
      email: '  Ada@Example.COM ',
      subject: ' Hello ',
      message: '  I would like to talk about a project.  ',
    });

    expect(result).toEqual({ ok: true, values: valid });
  });

  it('returns only the four known fields', () => {
    const result = validateContact({ ...valid, status: 'archived', isAdmin: true });

    expect(Object.keys(result.values)).toEqual(['name', 'email', 'subject', 'message']);
  });

  it('reports every empty field at once', () => {
    const result = validateContact({});

    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors)).toEqual(['name', 'email', 'subject', 'message']);
    expect(result.errors.name).toBe('Enter your name.');
  });

  it.each([null, undefined, 'text', 42, []])('treats %j as an empty submission', (input) => {
    expect(validateContact(input).ok).toBe(false);
  });

  it.each([42, true, ['a'], { a: 1 }, null])('rejects %j given as a text field', (value) => {
    expect(errorsFor({ name: value, subject: value, message: value, email: value })).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      subject: expect.any(String),
      message: expect.any(String),
    });
  });

  it('treats a whitespace-only field as empty', () => {
    expect(errorsFor({ name: '   ' }).name).toBe('Enter your name.');
  });

  describe('email', () => {
    it.each(['ada@example.com', 'first.last+tag@sub.example.co.id', 'a@b.io'])(
      'accepts %s',
      (email) => {
        expect(errorsFor({ email }).email).toBeUndefined();
      },
    );

    it.each([
      'ada',
      'ada@',
      '@example.com',
      'ada@example',
      'ada@@example.com',
      'ada@example..com',
      'ada@.example.com',
      'ada example@example.com',
      'ada@exa mple.com',
      'ada@example.com\nBcc: victim@example.com',
    ])('rejects %j', (email) => {
      expect(errorsFor({ email }).email).toBe(
        'Enter a valid email address, like name@example.com.',
      );
    });

    it('rejects an address over the length limit', () => {
      const email = `${'a'.repeat(CONTACT_LIMITS.email.max)}@example.com`;

      expect(errorsFor({ email }).email).toMatch(/254 characters or fewer/);
    });

    it('rejects a local part over 64 characters', () => {
      expect(errorsFor({ email: `${'a'.repeat(65)}@example.com` }).email).toMatch(/valid email/);
    });
  });

  describe('lengths', () => {
    it('accepts a name and subject at the limit and rejects one over it', () => {
      expect(errorsFor({ name: 'n'.repeat(CONTACT_LIMITS.name.max) }).name).toBeUndefined();
      expect(errorsFor({ name: 'n'.repeat(CONTACT_LIMITS.name.max + 1) }).name).toMatch(
        /100 characters or fewer/,
      );
      expect(
        errorsFor({ subject: 's'.repeat(CONTACT_LIMITS.subject.max) }).subject,
      ).toBeUndefined();
      expect(errorsFor({ subject: 's'.repeat(CONTACT_LIMITS.subject.max + 1) }).subject).toMatch(
        /150 characters or fewer/,
      );
    });

    it('requires a message of at least 10 characters', () => {
      expect(errorsFor({ message: 'too short' }).message).toBe(
        'Message must be at least 10 characters.',
      );
      expect(errorsFor({ message: '1234567890' }).message).toBeUndefined();
    });

    it('limits the message to 2000 characters', () => {
      expect(errorsFor({ message: 'm'.repeat(2000) }).message).toBeUndefined();
      expect(errorsFor({ message: 'm'.repeat(2001) }).message).toBe(
        'Message must be 2000 characters or fewer.',
      );
    });

    it('counts an emoji as one character, not two', () => {
      expect(errorsFor({ message: '😀'.repeat(2000) }).message).toBeUndefined();
      expect(errorsFor({ message: '😀'.repeat(2001) }).message).toMatch(/2000 characters or fewer/);
    });
  });

  describe('control characters', () => {
    it.each(['Ada\nLovelace', 'Ada\r\nBcc: x@example.com', 'Ada\u0000', 'Ada Lovelace'])(
      'rejects %j in the name and the subject',
      (text) => {
        expect(errorsFor({ name: text }).name).toMatch(/not allowed/);
        expect(errorsFor({ subject: text }).subject).toMatch(/not allowed/);
      },
    );

    it('allows line breaks and tabs in the message', () => {
      expect(errorsFor({ message: 'Line one\n\tline two, indented' }).message).toBeUndefined();
    });

    it('turns Windows line endings into plain line breaks', () => {
      const result = validateContact({ ...valid, message: 'First line here\r\nSecond line here' });

      expect(result.values.message).toBe('First line here\nSecond line here');
    });

    it('rejects other control characters in the message', () => {
      expect(errorsFor({ message: 'Hello there\u0007 friend' }).message).toMatch(/not allowed/);
    });
  });
});
