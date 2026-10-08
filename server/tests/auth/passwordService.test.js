import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  checkNewPassword,
  createPasswordService,
} from '../../src/services/passwordService.js';
import { cheapPasswordService } from '../helpers/auth.js';

describe('password service', () => {
  it('hashes with argon2id at the production settings and never stores the password', async () => {
    const hash = await createPasswordService().hash('a long enough password');

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(hash).not.toContain('a long enough password');
  });

  it('gives a different hash each time (random salt) and verifies only the right password', async () => {
    const service = cheapPasswordService();
    const [one, two] = await Promise.all([
      service.hash('pass-phrase one'),
      service.hash('pass-phrase one'),
    ]);

    expect(one).not.toBe(two);
    expect(await service.verify(one, 'pass-phrase one')).toBe(true);
    expect(await service.verify(one, 'pass-phrase two')).toBe(false);
    expect(await service.verify(one, '')).toBe(false);
  });

  it('treats a damaged or foreign hash as "does not match" instead of throwing', async () => {
    const service = cheapPasswordService();

    expect(await service.verify('not a hash', 'x')).toBe(false);
    expect(await service.verify('', 'x')).toBe(false);
    expect(service.needsRehash('not a hash')).toBe(false);
  });

  it('knows when a hash was made with weaker settings', async () => {
    const weak = cheapPasswordService({ timeCost: 1 });
    const strong = cheapPasswordService({ timeCost: 3 });
    const hash = await weak.hash('pass-phrase one');

    expect(weak.needsRehash(hash)).toBe(false);
    expect(strong.needsRehash(hash)).toBe(true);
  });

  it('does a real check against a decoy, without throwing, for unknown accounts', async () => {
    await expect(cheapPasswordService().verifyDecoy('anything')).resolves.toBeUndefined();
  });
});

describe('checkNewPassword', () => {
  it('accepts a long password', () => {
    expect(
      checkNewPassword('correct horse battery staple', { email: 'me@example.com' }),
    ).toBeNull();
  });

  it.each([
    ['too short', 'short-one', /at least 12/],
    ['too long', 'a1'.repeat(PASSWORD_MAX_LENGTH), /at most 200/],
    ['only spaces', ' '.repeat(PASSWORD_MIN_LENGTH), /only spaces/],
    ['one repeated character', 'a'.repeat(20), /more different/],
    ['not a string', undefined, /at least 12/],
  ])('refuses a password that is %s', (name, password, message) => {
    expect(checkNewPassword(password)).toMatch(message);
  });

  it('refuses a password that contains the email address or its name part', () => {
    const email = 'hasan.rabbani@example.com';

    expect(checkNewPassword('xx-HASAN.RABBANI-xx-1', { email })).toMatch(/email/);
    expect(checkNewPassword('my hasan.rabbani@example.com', { email })).toMatch(/email/);
  });

  it('does not reject a password only because a very short name part appears in it', () => {
    expect(checkNewPassword('a-perfectly-fine-password', { email: 'al@example.com' })).toBeNull();
  });
});
