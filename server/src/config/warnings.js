/**
 * Things that are valid but probably a mistake in production. The server logs each one as a
 * warning when it starts; it never refuses to start because of them.
 */
export function productionWarnings(env) {
  if (env.NODE_ENV !== 'production') {
    return [];
  }

  const warnings = [];

  if (env.TRUST_PROXY_HOPS === 0) {
    warnings.push(
      'TRUST_PROXY_HOPS is 0. Hosting platforms put a proxy in front of the server, so every ' +
        'visitor would look like the same address and the contact limit (5 messages per hour) ' +
        'would apply to the whole site at once. Set it to the number of proxies in front of the ' +
        'server (usually 1).',
    );
  }

  if (!env.SMTP_HOST) {
    warnings.push(
      'Contact email notifications are off (SMTP_HOST is not set). There is no admin page, so ' +
        'you would only see new messages by running "npm run messages".',
    );
  }

  return warnings;
}
