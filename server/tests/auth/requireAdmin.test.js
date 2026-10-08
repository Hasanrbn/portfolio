import { describe, expect, it, vi } from 'vitest';
import { createRequireAdmin } from '../../src/middleware/requireAdmin.js';
import { SESSION_ABSOLUTE_LIFETIME_MS } from '../../src/middleware/session.js';

function fakeRequest(sessionData) {
  const session = { ...sessionData, destroy: vi.fn((callback) => callback()) };
  return { session };
}

const admin = { id: 'u1', email: 'admin@example.com', role: 'admin', passwordHash: 'secret-hash' };

describe('requireAdmin', () => {
  it('lets an existing admin through and exposes only the public fields', async () => {
    const userStore = { findById: vi.fn().mockResolvedValue(admin) };
    const req = fakeRequest({ userId: 'u1', authenticatedAt: 1_000 });
    const next = vi.fn();

    await createRequireAdmin({ userStore, now: () => 2_000 })(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'u1', email: 'admin@example.com', role: 'admin' });
  });

  it('refuses a session that has no user, without asking the database', async () => {
    const userStore = { findById: vi.fn() };
    const next = vi.fn();

    await createRequireAdmin({ userStore })(fakeRequest({}), {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
    expect(userStore.findById).not.toHaveBeenCalled();
  });

  it('ends a sign-in older than the absolute limit, however active it was', async () => {
    const userStore = { findById: vi.fn().mockResolvedValue(admin) };
    const req = fakeRequest({ userId: 'u1', authenticatedAt: 1_000 });
    const next = vi.fn();
    const now = () => 1_000 + SESSION_ABSOLUTE_LIFETIME_MS + 1;

    await createRequireAdmin({ userStore, now })(req, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
    expect(req.session.destroy).toHaveBeenCalled();
    expect(userStore.findById).not.toHaveBeenCalled();
  });

  it('still accepts a sign-in just inside the limit', async () => {
    const userStore = { findById: vi.fn().mockResolvedValue(admin) };
    const req = fakeRequest({ userId: 'u1', authenticatedAt: 1_000 });
    const next = vi.fn();
    const now = () => 1_000 + SESSION_ABSOLUTE_LIFETIME_MS;

    await createRequireAdmin({ userStore, now })(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('treats a session without a sign-in time as expired', async () => {
    const userStore = { findById: vi.fn().mockResolvedValue(admin) };
    const req = fakeRequest({ userId: 'u1' });
    const next = vi.fn();

    await createRequireAdmin({ userStore })(req, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });
});
