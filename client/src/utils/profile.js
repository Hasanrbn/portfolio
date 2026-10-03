// Helpers that turn raw values in shared/siteConfig.json into something safe to render.
// A value that is empty or still a placeholder (such as "CV_URL") yields null, so the page
// leaves that element out instead of showing a broken link or image.

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

// A file served by this site, such as "/cv.pdf". Rejects "//host/file", which browsers treat
// as another site, and backslashes, which some browsers read as slashes.
function isSitePath(value) {
  return typeof value === 'string' && /^\/(?![/\\])\S*$/.test(value);
}

function isUsableAddress(value) {
  return isSitePath(value) || (typeof value === 'string' && isHttpsUrl(value));
}

/** Picture address from the config, or null when none is set. */
export function getAvatarSource(value) {
  return isUsableAddress(value) ? value : null;
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
