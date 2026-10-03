const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_EMAIL_DOMAIN = 'example.com';

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isRealEmail(value) {
  return (
    typeof value === 'string' &&
    EMAIL_PATTERN.test(value) &&
    !value.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)
  );
}

/**
 * Builds the list of contact links from siteConfig, keeping only real ones. Placeholder
 * values such as "GITHUB_URL" or "email@example.com" are skipped so the site never shows a
 * broken link or a profile that does not exist; a link appears as soon as a real value is set.
 * Only https URLs are accepted, which also rules out "javascript:" links.
 */
export function getSocialLinks(config) {
  const links = [];

  if (isHttpsUrl(config.social?.github)) {
    links.push({ id: 'github', label: 'GitHub', href: config.social.github, icon: 'github' });
  }
  if (isHttpsUrl(config.social?.linkedin)) {
    links.push({
      id: 'linkedin',
      label: 'LinkedIn',
      href: config.social.linkedin,
      icon: 'linkedin',
    });
  }
  if (isRealEmail(config.email)) {
    links.push({ id: 'email', label: 'Email', href: `mailto:${config.email}`, icon: 'mail' });
  }

  return links;
}
