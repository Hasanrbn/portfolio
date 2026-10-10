import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendContactMessage } from '../src/services/contactService.js';

const payload = {
  name: 'Ada',
  email: 'ada@example.com',
  subject: 'Hi',
  message: 'Hello there, friend.',
};

function answer(status, body) {
  return vi.fn().mockResolvedValue({
    status,
    json: body === undefined ? () => Promise.reject(new SyntaxError('no body')) : async () => body,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('sendContactMessage', () => {
  it('posts the message as JSON to /api/contact', async () => {
    const fetchImpl = answer(201, { success: true });

    const result = await sendContactMessage(payload, { fetchImpl });

    expect(result).toEqual({ ok: true });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/contact');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('returns the field messages of a 422, keeping only the form fields and plain text', async () => {
    const fetchImpl = answer(422, {
      success: false,
      errors: [
        { field: 'email', message: 'Enter a valid email address, like name@example.com.' },
        { field: 'email', message: 'second message for the same field is ignored' },
        { field: 'isAdmin', message: 'not a form field' },
        { field: 'name', message: { html: '<b>no</b>' } },
        null,
      ],
    });

    const result = await sendContactMessage(payload, { fetchImpl });

    expect(result).toEqual({
      ok: false,
      kind: 'validation',
      fieldErrors: { email: 'Enter a valid email address, like name@example.com.' },
    });
  });

  it('treats a 422 without usable field messages as a general error', async () => {
    const result = await sendContactMessage(payload, { fetchImpl: answer(422, { errors: [] }) });

    expect(result).toEqual({ ok: false, kind: 'error', message: 'Something went wrong.' });
  });

  it('passes on the rate-limit message, with a fallback when there is none', async () => {
    const limited = await sendContactMessage(payload, {
      fetchImpl: answer(429, { message: 'Too many messages. Please try again later.' }),
    });
    const bare = await sendContactMessage(payload, { fetchImpl: answer(429, {}) });

    expect(limited).toEqual({
      ok: false,
      kind: 'rate-limit',
      message: 'Too many messages. Please try again later.',
    });
    expect(bare.message).toBe('Too many messages. Please try again later.');
  });

  it.each([400, 413, 500, 503])('answers a generic error for status %i', async (status) => {
    const result = await sendContactMessage(payload, {
      fetchImpl: answer(status, { message: 'secret server detail' }),
    });

    expect(result).toEqual({ ok: false, kind: 'error', message: 'Something went wrong.' });
  });

  it('answers a generic error when the reply is not JSON or the network fails', async () => {
    const notJson = await sendContactMessage(payload, { fetchImpl: answer(500, undefined) });
    const offline = await sendContactMessage(payload, {
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    });

    expect(notJson.kind).toBe('error');
    expect(offline).toEqual({ ok: false, kind: 'error', message: 'Something went wrong.' });
  });

  it('gives up on a request that never answers', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );

    const pending = sendContactMessage(payload, { fetchImpl });
    await vi.advanceTimersByTimeAsync(71_000);

    expect(await pending).toEqual({ ok: false, kind: 'error', message: 'Something went wrong.' });
  });
});
