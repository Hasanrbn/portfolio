import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApiUrl } from '../src/utils/apiUrl.js';
import { resetWakeServer, wakeServer } from '../src/services/contactService.js';

describe('buildApiUrl', () => {
  it('keeps the path as it is when the API is on the same address as the page', () => {
    expect(buildApiUrl(undefined, '/api/contact')).toBe('/api/contact');
    expect(buildApiUrl('', '/api/contact')).toBe('/api/contact');
    expect(buildApiUrl('   ', '/api/contact')).toBe('/api/contact');
  });

  it('puts the API address in front of the path, without doubling slashes', () => {
    expect(buildApiUrl('https://api.example.com', '/api/contact')).toBe(
      'https://api.example.com/api/contact',
    );
    expect(buildApiUrl(' https://api.example.com/// ', '/healthz')).toBe(
      'https://api.example.com/healthz',
    );
  });
});

describe('wakeServer', () => {
  beforeEach(() => resetWakeServer());

  it('does nothing while the API is on the same address as the page', () => {
    const fetchImpl = vi.fn();

    wakeServer({ fetchImpl, base: '' });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('asks a separate API for its health check once, without reading the answer', () => {
    const fetchImpl = vi.fn().mockResolvedValue({});

    wakeServer({ fetchImpl, base: 'https://api.example.com' });
    wakeServer({ fetchImpl, base: 'https://api.example.com' });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/healthz', {
      mode: 'no-cors',
      cache: 'no-store',
    });
  });

  it('ignores failures: it is only a courtesy request', async () => {
    const rejecting = vi.fn().mockRejectedValue(new Error('offline'));
    expect(() =>
      wakeServer({ fetchImpl: rejecting, base: 'https://api.example.com' }),
    ).not.toThrow();

    resetWakeServer();
    const throwing = vi.fn(() => {
      throw new Error('blocked');
    });
    expect(() =>
      wakeServer({ fetchImpl: throwing, base: 'https://api.example.com' }),
    ).not.toThrow();
    await Promise.resolve();
  });
});
