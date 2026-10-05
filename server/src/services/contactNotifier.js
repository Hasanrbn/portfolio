import nodemailer from 'nodemailer';

const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

/**
 * Builds the email that tells the site owner about a new message.
 *
 * Plain text only, so nothing the visitor typed is ever interpreted as HTML. The visitor's
 * address goes in Reply-To (the From address stays the site's own, which mail providers
 * require). Name, email and subject have already been checked to contain no line breaks,
 * so none of them can add headers to the message.
 */
export function buildNotificationEmail({ name, email, subject, message }, { from, to }) {
  return {
    from,
    to,
    replyTo: { name, address: email },
    subject: `[Portfolio] ${subject}`,
    text: [
      'New message from the contact form on your portfolio.',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      '',
      message,
    ].join('\n'),
  };
}

/**
 * Sends one email per contact message. `transport` is anything with `sendMail`
 * (a nodemailer transport in production, a stub in tests).
 *
 * `notify` never throws: the message is already saved when this runs, so a mail
 * outage must not turn a saved message into an error for the visitor. Failures are
 * logged with the error code only, never the message, which is personal data.
 */
export function createContactNotifier({ transport, from, to, logger }) {
  return {
    async notify(record) {
      try {
        await transport.sendMail(buildNotificationEmail(record, { from, to }));
      } catch (error) {
        logger.error(
          `Contact email notification failed (${error?.code ?? error?.name ?? 'error'})`,
        );
      }
    },
  };
}

/** Returns a notifier for the SMTP settings in `env`, or null when SMTP is not configured. */
export function createNotifierFromEnv(env, logger) {
  if (!env.SMTP_HOST) {
    return null;
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    // Never send the password over an unencrypted connection.
    requireTLS: !env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  });

  return createContactNotifier({
    transport,
    from: env.CONTACT_MAIL_FROM ?? env.SMTP_USER,
    to: env.CONTACT_NOTIFY_TO,
    logger,
  });
}
