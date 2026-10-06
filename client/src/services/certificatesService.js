import certificatesData from '@portfolio/shared/data/certificates.json';
import { getFileSource, getHttpsUrl } from '../utils/profile.js';
import { isPdfAddress } from '@portfolio/shared/validation.js';
import { isMonth } from '../utils/dates.js';
import { isText, text, uniqueBy } from './normalize.js';

// The check itself lives in shared/ so the server answers with the same value.
export { isPdfAddress };

function normalizeFile(file, title, issuer) {
  const url = getFileSource(file?.url);
  if (!url) {
    return null;
  }
  return {
    url,
    alt: text(file.alt) || `Certificate "${title}" issued by ${issuer}`,
    isPdf: isPdfAddress(url),
  };
}

function normalizeCertificate(entry) {
  const title = text(entry.title);
  const issuer = text(entry.issuer);

  return {
    id: entry.id,
    title,
    issuer,
    issuedDate: entry.issuedDate,
    year: entry.issuedDate.slice(0, 4),
    category: text(entry.category),
    credentialId: text(entry.credentialId),
    credentialUrl: getHttpsUrl(entry.credentialUrl),
    file: normalizeFile(entry.file, title, issuer),
    sortOrder: Number.isFinite(entry.sortOrder) ? entry.sortOrder : 0,
  };
}

/**
 * Cleans certificate data. An entry is dropped when it is hidden, lacks an id, title or issuer,
 * or has an issue date that is not a real "YYYY-MM". The credential link must be https and the
 * file must be a path on this site or an https address, otherwise it is left out. Ordered by
 * `sortOrder`, then newest first. The shape matches GET /api/certificates (Phase 15).
 */
export function normalizeCertificates(data) {
  const entries = Array.isArray(data?.certificates) ? data.certificates : [];

  const valid = entries
    .filter((entry) => entry && entry.visible !== false)
    .filter((entry) => isText(entry.id) && isText(entry.title) && isText(entry.issuer))
    .filter((entry) => isMonth(entry.issuedDate));

  return uniqueBy(valid, (entry) => entry.id)
    .map(normalizeCertificate)
    .sort((a, b) => a.sortOrder - b.sortOrder || b.issuedDate.localeCompare(a.issuedDate));
}

/** Certificates matching an issuer, a year and a category (all optional, all must match). */
export function filterCertificates(certificates, { issuer = '', year = '', category = '' } = {}) {
  return certificates.filter(
    (certificate) =>
      (!issuer || certificate.issuer === issuer) &&
      (!year || certificate.year === year) &&
      (!category || certificate.category === category),
  );
}

/** The issuers, years (newest first) and categories that exist, for the filter menus. */
export function getCertificateFilterOptions(certificates) {
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const alphabetical = (a, b) => a.localeCompare(b, 'en');

  return {
    issuers: unique(certificates.map((c) => c.issuer)).sort(alphabetical),
    years: unique(certificates.map((c) => c.year))
      .sort()
      .reverse(),
    categories: unique(certificates.map((c) => c.category)).sort(alphabetical),
  };
}

/** Async on purpose: only this function changes when the API replaces the seed file (Phase 15). */
export async function getCertificates() {
  return normalizeCertificates(certificatesData);
}
