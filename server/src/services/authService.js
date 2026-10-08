/**
 * The rules for signing in. No HTTP in here: the controller turns the result into a response.
 *
 *   authenticate({ email, password }) ->
 *     { status: 'ok', user }
 *     { status: 'invalid' }                         wrong email or password (the same answer for both)
 *     { status: 'blocked', retryAfterSeconds }      too many failed attempts for this email
 */
export function createAuthService({ userStore, passwordService, throttle, logger }) {
  return {
    async authenticate({ email, password }) {
      const retryAfterSeconds = throttle.blockedFor(email);
      if (retryAfterSeconds > 0) {
        // Not even checked: a blocked address costs the server nothing.
        return { status: 'blocked', retryAfterSeconds };
      }

      const user = await userStore.findByEmail(email);
      let valid = false;
      if (user) {
        valid = await passwordService.verify(user.passwordHash, password);
      } else {
        await passwordService.verifyDecoy(password);
      }

      if (!user || !valid) {
        throttle.recordFailure(email);
        return { status: 'invalid' };
      }

      throttle.reset(email);

      // The hash was made with older, weaker settings: replace it now that the password is known.
      // Failing to do so must not stop a correct sign-in.
      if (passwordService.needsRehash(user.passwordHash)) {
        try {
          await userStore.updatePasswordHash(user.id, await passwordService.hash(password));
        } catch (error) {
          logger?.warn({ err: error }, 'could not upgrade a password hash');
        }
      }

      await userStore.recordLogin(user.id);
      return { status: 'ok', user };
    },
  };
}
