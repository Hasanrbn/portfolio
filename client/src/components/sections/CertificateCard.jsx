import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import Icon from '../ui/Icon.jsx';
import { formatMonth } from '../../utils/dates.js';
import styles from './CertificateCard.module.css';

/**
 * One certificate: a preview of the picture (or a PDF symbol), who issued it and when, and links
 * to the file and to the issuer's verification page. Parts that are not set are left out.
 */
export default function CertificateCard({ certificate, headingAs: Heading = 'h2' }) {
  const { file } = certificate;

  return (
    <Card as="li" className={styles.card}>
      {file &&
        (file.isPdf ? (
          <div className={styles.pdf} aria-hidden="true">
            <Icon name="file" size={40} />
            <span>PDF</span>
          </div>
        ) : (
          <img
            className={styles.image}
            src={file.url}
            alt={file.alt}
            loading="lazy"
            decoding="async"
          />
        ))}

      <Heading className={styles.title}>{certificate.title}</Heading>
      <p className={styles.issuer}>{certificate.issuer}</p>
      <p className={styles.meta}>
        <time dateTime={certificate.issuedDate}>{formatMonth(certificate.issuedDate)}</time>
        {certificate.category && <Badge>{certificate.category}</Badge>}
      </p>
      {certificate.credentialId && (
        <p className={styles.credential}>
          Credential ID: <code>{certificate.credentialId}</code>
        </p>
      )}

      {(file || certificate.credentialUrl) && (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul role="list" className={styles.links}>
          {file && (
            <li>
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                View certificate{' '}
                <span className="visually-hidden">
                  for {certificate.title} ({file.isPdf ? 'PDF, ' : ''}opens in a new tab)
                </span>
              </a>
            </li>
          )}
          {certificate.credentialUrl && (
            <li>
              <a href={certificate.credentialUrl} target="_blank" rel="noopener noreferrer">
                Verify credential{' '}
                <span className="visually-hidden">
                  for {certificate.title} (opens in a new tab)
                </span>
              </a>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
