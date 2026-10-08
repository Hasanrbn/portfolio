import { describe, expect, it } from 'vitest';
import { formatMessage } from '../src/db/messages.js';

const message = {
  id: '11111111-2222-4333-8444-555555555555',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Working together',
  message: 'Hello,\n\nI would like to talk about a project.',
  status: 'new',
  createdAt: '2026-10-08T14:03:59.000Z',
};

describe('formatMessage', () => {
  it('shows one line with date, status, sender, subject and the start of the text', () => {
    const line = formatMessage(message);

    expect(line).toBe(
      '2026-10-08 14:03 UTC  new      Ada Lovelace <ada@example.com>  Working together | Hello, I would like to talk about a project.',
    );
    expect(line).not.toContain('\n');
  });

  it('cuts a long text in the one-line form', () => {
    const line = formatMessage({ ...message, message: 'word '.repeat(100) });

    expect(line.endsWith('…')).toBe(true);
    expect(line.length).toBeLessThan(200);
  });

  it('shows the whole text, with its line breaks, in the full form', () => {
    const text = formatMessage(message, { full: true });

    expect(text).toContain('From:    Ada Lovelace <ada@example.com>');
    expect(text).toContain('Subject: Working together');
    expect(text).toContain(message.id);
    expect(text.endsWith('Hello,\n\nI would like to talk about a project.')).toBe(true);
  });

  it('removes characters that could rewrite the terminal (escape codes, carriage returns)', () => {
    const hostile = {
      ...message,
      name: 'Eve\u001b[2J',
      subject: 'Hi\rFAKE LINE',
      message: 'text\u001b]0;title\u0007 and \u0085more\u2028here',
    };

    const hasUnsafe = (text) =>
      [...text].some((char) => {
        const code = char.codePointAt(0);
        return (
          (code <= 0x1f && code !== 0x0a && code !== 0x09) ||
          (code >= 0x7f && code <= 0x9f) ||
          code === 0x2028 ||
          code === 0x2029
        );
      });
    for (const full of [false, true]) {
      expect(hasUnsafe(formatMessage(hostile, { full }))).toBe(false);
    }
    expect(formatMessage(hostile, { full: true })).toContain('Hi' + 'FAKE LINE');
  });
});
