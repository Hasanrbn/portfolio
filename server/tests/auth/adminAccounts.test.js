import { describe, expect, it, vi } from 'vitest';
import { createMemoryUserStore } from '../../src/repositories/users.js';
import {
  AdminAccountError,
  createAdminAccount,
  parseAdminEmail,
  resetAdminPassword,
} from '../../src/services/adminAccountService.js';
import { cheapPasswordService } from '../helpers/auth.js';

const PASSWORD = 'correct horse battery staple';

function setup() {
  return { userStore: createMemoryUserStore(), passwordService: cheapPasswordService() };
}

describe('createAdminAccount', () => {
  it('stores a lower-case email and an argon2id hash, and returns no hash', async () => {
    const deps = setup();

    const result = await createAdminAccount({
      ...deps,
      email: '  Ada@Example.COM ',
      password: PASSWORD,
    });

    expect(result).toEqual({ id: expect.any(String), email: 'ada@example.com' });
    const stored = await deps.userStore.findByEmail('ADA@example.com');
    expect(stored.role).toBe('admin');
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toContain(PASSWORD);
  });

  it.each(['', 'not-an-email', 'a@b', 'x'.repeat(250) + '@example.com'])(
    'refuses the email %j',
    async (email) => {
      await expect(createAdminAccount({ ...setup(), email, password: PASSWORD })).rejects.toThrow(
        'Enter a valid email address.',
      );
    },
  );

  it('refuses a weak password and creates nothing', async () => {
    const deps = setup();

    await expect(
      createAdminAccount({ ...deps, email: 'ada@example.com', password: 'short' }),
    ).rejects.toBeInstanceOf(AdminAccountError);
    expect(await deps.userStore.findByEmail('ada@example.com')).toBeNull();
  });

  it('refuses a second account with the same email and points to the reset command', async () => {
    const deps = setup();
    await createAdminAccount({ ...deps, email: 'ada@example.com', password: PASSWORD });

    await expect(
      createAdminAccount({ ...deps, email: 'ADA@example.com', password: PASSWORD }),
    ).rejects.toThrow(/already exists.*admin:reset-password/);
  });
});

describe('resetAdminPassword', () => {
  it("changes the hash and closes the account's sessions", async () => {
    const deps = setup();
    await createAdminAccount({ ...deps, email: 'ada@example.com', password: PASSWORD });
    const before = (await deps.userStore.findByEmail('ada@example.com')).passwordHash;
    const revokeSessions = vi.fn().mockResolvedValue(2);

    const result = await resetAdminPassword({
      ...deps,
      revokeSessions,
      email: 'ada@example.com',
      password: 'another long pass-phrase',
    });

    const after = (await deps.userStore.findByEmail('ada@example.com')).passwordHash;
    expect(after).not.toBe(before);
    expect(await deps.passwordService.verify(after, 'another long pass-phrase')).toBe(true);
    expect(revokeSessions).toHaveBeenCalledWith(result.id);
    expect(result.closedSessions).toBe(2);
  });

  it('changes nothing for an unknown account or a weak password', async () => {
    const deps = setup();
    const revokeSessions = vi.fn();
    await createAdminAccount({ ...deps, email: 'ada@example.com', password: PASSWORD });
    const before = (await deps.userStore.findByEmail('ada@example.com')).passwordHash;

    await expect(
      resetAdminPassword({
        ...deps,
        revokeSessions,
        email: 'nobody@example.com',
        password: PASSWORD,
      }),
    ).rejects.toThrow(/No account/);
    await expect(
      resetAdminPassword({ ...deps, revokeSessions, email: 'ada@example.com', password: 'short' }),
    ).rejects.toThrow(/at least 12/);

    expect((await deps.userStore.findByEmail('ada@example.com')).passwordHash).toBe(before);
    expect(revokeSessions).not.toHaveBeenCalled();
  });
});

describe('parseAdminEmail', () => {
  it('trims and lower-cases', () => {
    expect(parseAdminEmail('  Me@Example.org ')).toBe('me@example.org');
  });
});
