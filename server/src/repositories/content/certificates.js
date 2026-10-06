import { isPdfAddress } from '@portfolio/shared/validation.js';

/** Read-only access to certificates, in the client's shape. */
export function createCertificatesRepository({ pool }) {
  return {
    async list() {
      const { rows } = await pool.query(
        `SELECT slug AS id, title, issuer, to_char(issued_date, 'YYYY-MM') AS issued_date,
                category, credential_id, credential_url, file_url, file_alt, sort_order
           FROM certificates
          WHERE is_visible
          ORDER BY sort_order, issued_date DESC, id`,
      );

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        issuer: row.issuer,
        issuedDate: row.issued_date,
        year: row.issued_date.slice(0, 4),
        category: row.category.trim(),
        credentialId: (row.credential_id ?? '').trim(),
        credentialUrl: row.credential_url,
        file: row.file_url
          ? {
              url: row.file_url,
              alt: row.file_alt?.trim() || `Certificate "${row.title}" issued by ${row.issuer}`,
              isPdf: isPdfAddress(row.file_url),
            }
          : null,
        sortOrder: row.sort_order,
      }));
    },
  };
}
