import { z } from 'zod';
import { DuplicateEmailError, normalizeEmail } from '../repositories/users.js';
import { checkNewPassword } from './passwordService.js';

/** A problem the person at the terminal can fix; the message is meant to be shown as it is. */
export class AdminAccountError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdminAccountError';
  }
}

const emailSchema = z.string().trim().min(3).max(254).pipe(z.email());

/** Returns the cleaned email, or throws an AdminAccountError. */
export function parseAdminEmail(input) {
  const result = emailSchema.safeParse(input ?? '');
  if (!result.success) {
    throw new AdminAccountError('Enter a valid email address.');
  }
  return normalizeEmail(result.data);
}

/** Creates an admin account. The password is hashed here and never stored or returned. */
export async function createAdminAccount({ userStore, passwordService, email, password }) {
  const address = parseAdminEmail(email);
  const problem = checkNewPassword(password, { email: address });
  if (problem) {
    throw new AdminAccountError(problem);
  }

  try {
    const user = await userStore.create({
      email: address,
      passwordHash: await passwordService.hash(password),
    });
    return { id: user.id, email: user.email };
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      throw new AdminAccountError(
        'An account with this email already exists. To change its password use "npm run admin:reset-password".',
      );
    }
    throw error;
  }
}

/**
 * Sets a new password and signs the account out everywhere (`revokeSessions(userId)` should
 * delete its sessions), so a stolen session does not survive the change.
 */
export async function resetAdminPassword({
  userStore,
  passwordService,
  revokeSessions,
  email,
  password,
}) {
  const address = parseAdminEmail(email);
  const user = await userStore.findByEmail(address);
  if (!user) {
    throw new AdminAccountError(
      'No account with this email. Create it with "npm run admin:create".',
    );
  }
  const problem = checkNewPassword(password, { email: address });
  if (problem) {
    throw new AdminAccountError(problem);
  }

  await userStore.updatePasswordHash(user.id, await passwordService.hash(password));
  const closedSessions = await revokeSessions(user.id);
  return { id: user.id, email: user.email, closedSessions };
}
