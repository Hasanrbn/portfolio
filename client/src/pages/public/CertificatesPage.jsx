import PageTitle from '../../components/layout/PageTitle.jsx';
import { PAGE_DESCRIPTIONS } from '../../utils/pageDescriptions.js';
import CertificateCard from '../../components/sections/CertificateCard.jsx';
import CertificateFilters from '../../components/sections/CertificateFilters.jsx';
import AsyncView from '../../components/ui/AsyncView.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import useAsync from '../../hooks/useAsync.js';
import useUrlFilters from '../../hooks/useUrlFilters.js';
import {
  filterCertificates,
  getCertificateFilterOptions,
  getCertificates,
} from '../../services/certificatesService.js';
import listStyles from './ListPage.module.css';
import styles from './CertificatesPage.module.css';

// With one certificate there is nothing to narrow down, so the filters stay hidden.
const MIN_CERTIFICATES_FOR_FILTERS = 2;

function resultText(shown, total) {
  const noun = total === 1 ? 'certificate' : 'certificates';
  return shown === total ? `${total} ${noun}` : `Showing ${shown} of ${total} ${noun}`;
}

function CertificateList({ certificates }) {
  const { requested, setFilter, clearFilters } = useUrlFilters(['issuer', 'year', 'category']);
  const showFilters = certificates.length >= MIN_CERTIFICATES_FOR_FILTERS;
  const options = getCertificateFilterOptions(certificates);

  // Values come from the address, so they can be anything. One that matches no certificate is
  // ignored instead of hiding every certificate.
  const values = {
    issuer: options.issuers.includes(requested.issuer) ? requested.issuer : '',
    year: options.years.includes(requested.year) ? requested.year : '',
    category: options.categories.includes(requested.category) ? requested.category : '',
  };
  const visible = showFilters ? filterCertificates(certificates, values) : certificates;

  return (
    <div className={styles.content}>
      {showFilters && (
        <CertificateFilters
          values={values}
          options={options}
          onChange={setFilter}
          onClear={clearFilters}
          resultText={resultText(visible.length, certificates.length)}
        />
      )}

      {visible.length > 0 ? (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul role="list" className={styles.grid}>
          {visible.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No certificates match"
          description="Try a different combination or remove a filter."
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      )}
    </div>
  );
}

export default function CertificatesPage() {
  const { status, data: certificates, retry } = useAsync(getCertificates);

  return (
    <>
      <PageTitle title="Certificates" description={PAGE_DESCRIPTIONS.certificates} />
      <h1>Certificates</h1>
      <p className={listStyles.lead}>Courses and credentials I have completed.</p>

      <div className={listStyles.body}>
        <AsyncView
          status={status}
          onRetry={retry}
          loadingLabel="Loading certificates"
          errorTitle="Certificates could not be loaded."
          isEmpty={status === 'success' && certificates.length === 0}
          empty={{
            title: 'No certificates yet',
            description: 'Certificates will appear here once they are added.',
          }}
        >
          {() => <CertificateList certificates={certificates} />}
        </AsyncView>
      </div>
    </>
  );
}
