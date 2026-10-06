import { isHttpsUrl, isSitePath, isUsableAddress } from '@portfolio/shared/validation.js';

// Helpers that turn raw values in shared/siteConfig.json into something safe to render.
// A value that is empty or still a placeholder (such as "CV_URL") yields null, so the page
// leaves that element out instead of showing a broken link or image.

/** The value when it is an https address, otherwise null. Used for links to other sites. */
export function getHttpsUrl(value) {
  return typeof value === 'string' && isHttpsUrl(value) ? value : null;
}

/** Image address (a file on this site or an https address), or null when unusable. */
export function getImageSource(value) {
  return isUsableAddress(value) ? value : null;
}

/** File address (a file on this site or an https address), for downloads such as a certificate PDF. */
export function getFileSource(value) {
  return isUsableAddress(value) ? value : null;
}

/** Picture address from the config, or null when none is set. */
export function getAvatarSource(value) {
  return getImageSource(value);
}

/**
 * Where the CV download points, or null while it is still a placeholder.
 * `isExternal` is true for another site (opened in a new tab) and false for a file in this
 * site's public folder (downloaded directly).
 */
export function getResumeLink(value) {
  if (!isUsableAddress(value)) {
    return null;
  }
  return { href: value, isExternal: !isSitePath(value) };
}

/** First letters of the first and last word of a name: "Muhammad Hasan Rabbani" becomes "MR". */
export function getInitials(name) {
  const words = typeof name === 'string' ? name.trim().split(/\s+/).filter(Boolean) : [];
  if (words.length === 0) {
    return '';
  }
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : '';
  return Array.from(first)[0].toUpperCase() + (last ? Array.from(last)[0].toUpperCase() : '');
}
