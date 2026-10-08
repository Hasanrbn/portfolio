import { describe, expect, it } from 'vitest';
import { createLoginThrottle } from '../../src/services/loginThrottle.js';

function setup(options = {}) {
  const clock = { time: 1_000_000 };
  const throttle = createLoginThrottle({
    limit: 3,
    windowMs: 60_000,
    now: () => clock.time,
    ...options,
  });
  return { throttle, clock };
}

const fail = (throttle, email, times) => {
  for (let i = 0; i < times; i += 1) throttle.recordFailure(email);
};

describe('login throttle', () => {
  it('lets attempts through until the limit, then blocks with the time left', () => {
    const { throttle, clock } = setup();

    fail(throttle, 'a@example.com', 2);
    expect(throttle.blockedFor('a@example.com')).toBe(0);

    throttle.recordFailure('a@example.com');
    expect(throttle.blockedFor('a@example.com')).toBe(60);

    clock.time += 10_500;
    expect(throttle.blockedFor('a@example.com')).toBe(50);
  });

  it('counts each address on its own', () => {
    const { throttle } = setup();

    fail(throttle, 'a@example.com', 3);

    expect(throttle.blockedFor('a@example.com')).toBeGreaterThan(0);
    expect(throttle.blockedFor('b@example.com')).toBe(0);
  });

  it('ends the block when the window is over and starts counting again', () => {
    const { throttle, clock } = setup();
    fail(throttle, 'a@example.com', 3);

    clock.time += 60_001;

    expect(throttle.blockedFor('a@example.com')).toBe(0);
    throttle.recordFailure('a@example.com');
    expect(throttle.blockedFor('a@example.com')).toBe(0);
  });

  it('does not extend the block when more attempts arrive (the real owner is not locked out for ever)', () => {
    const { throttle, clock } = setup();
    fail(throttle, 'a@example.com', 3);

    clock.time += 30_000;
    fail(throttle, 'a@example.com', 20);

    expect(throttle.blockedFor('a@example.com')).toBe(30);
  });

  it('forgets the count after a correct password', () => {
    const { throttle } = setup();
    fail(throttle, 'a@example.com', 2);

    throttle.reset('a@example.com');
    throttle.recordFailure('a@example.com');

    expect(throttle.blockedFor('a@example.com')).toBe(0);
  });

  it('keeps a bounded number of addresses, dropping the oldest', () => {
    const { throttle } = setup({ maxKeys: 3, limit: 1 });
    for (const name of ['a', 'b', 'c', 'd']) throttle.recordFailure(`${name}@example.com`);

    expect(throttle.blockedFor('a@example.com')).toBe(0); // dropped
    expect(throttle.blockedFor('d@example.com')).toBeGreaterThan(0);
  });
});
