import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import certificatesData from '@portfolio/shared/data/certificates.json';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import CertificateCard from '../src/components/sections/CertificateCard.jsx';
import {
  filterCertificates,
  getCertificateFilterOptions,
  getCertificates,
  isPdfAddress,
  normalizeCertificates,
} from '../src/services/certificatesService.js';

vi.mock('../src/services/certificatesService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getCertificates: vi.fn(actual.getCertificates) };
});

const realGetCertificates = getCertificates.getMockImplementation();

const entry = (overrides) => ({
  id: 'c',
  title: 'Web Basics',
  issuer: 'Example Academy',
  issuedDate: '2025-03',
  ...overrides,
});

const make = (entries) => normalizeCertificates({ certificates: entries });

const THREE = () =>
  make([
    entry({
      id: 'a',
      title: 'Cloud Basics',
      issuer: 'Acme',
      issuedDate: '2025-06',
      category: 'Cloud',
    }),
    entry({
      id: 'b',
      title: 'JS Course',
      issuer: 'Example Academy',
      issuedDate: '2024-02',
      category: 'Web',
    }),
    entry({
      id: 'c',
      title: 'React Course',
      issuer: 'Example Academy',
      issuedDate: '2025-01',
      category: 'Web',
    }),
  ]);

function renderPage(path = '/certificates') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const main = () => screen.getByRole('main');
const titles = () =>
  within(main())
    .queryAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);

beforeEach(() => {
  getCertificates.mockReset().mockImplementation(realGetCertificates);
});

describe('certificates page', () => {
  it('shows an honest empty state while no certificate has been added', async () => {
    getCertificates.mockResolvedValue([]);
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Certificates' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No certificates yet' })).toBeInTheDocument();
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('announces loading, then shows the content', async () => {
    getCertificates.mockResolvedValue([]);
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading certificates');
    await screen.findByRole('heading', { name: 'No certificates yet' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a friendly error and recovers on Try again', async () => {
    const user = userEvent.setup();
    getCertificates
      .mockRejectedValueOnce(new Error('secret internal detail'))
      .mockResolvedValueOnce([]);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('secret internal detail');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'No certificates yet' })).toBeVisible();
  });

  it('shows one certificate without filters', async () => {
    getCertificates.mockResolvedValue(make([entry({})]));
    renderPage();

    expect(await screen.findByRole('heading', { level: 2, name: 'Web Basics' })).toBeVisible();
    expect(screen.queryByRole('search')).toBeNull();
  });
});

describe('filtering', () => {
  beforeEach(() => {
    getCertificates.mockImplementation(async () => THREE());
  });

  it('lists everything newest first, with filters and a count', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Cloud Basics' });

    expect(titles()).toEqual(['Cloud Basics', 'React Course', 'JS Course']);
    expect(screen.getByRole('search', { name: 'Filter certificates' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3 certificates');
  });

  it('offers only options that exist: issuers and categories sorted, years newest first', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Cloud Basics' });

    const names = (label) =>
      within(screen.getByRole('combobox', { name: label }))
        .getAllByRole('option')
        .map((option) => option.textContent);
    expect(names('Issuer')).toEqual(['All issuers', 'Acme', 'Example Academy']);
    expect(names('Year')).toEqual(['All years', '2025', '2024']);
    expect(names('Category')).toEqual(['All categories', 'Cloud', 'Web']);
  });

  it('filters by issuer, year and category together', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Cloud Basics' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Issuer' }), 'Example Academy');
    expect(titles()).toEqual(['React Course', 'JS Course']);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 3 certificates');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Year' }), '2025');
    expect(titles()).toEqual(['React Course']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Web');
    expect(titles()).toEqual(['React Course']);
  });

  it('starts from the filters in the address and ignores unknown values', async () => {
    renderPage('/certificates?year=2024&category=Nothing');
    await screen.findByRole('heading', { level: 2, name: 'JS Course' });

    expect(titles()).toEqual(['JS Course']);
    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2024');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
  });

  it('explains when nothing matches and clears the filters from there', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Cloud Basics' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Issuer' }), 'Acme');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Year' }), '2024');
    const empty = screen.getByRole('heading', { name: 'No certificates match' }).parentElement;
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }));

    expect(titles()).toEqual(['Cloud Basics', 'React Course', 'JS Course']);
    expect(screen.getByRole('combobox', { name: 'Issuer' })).toHaveValue('');
  });
});

describe('CertificateCard', () => {
  const card = (overrides, props) =>
    render(
      <ul>
        <CertificateCard certificate={make([entry(overrides)])[0]} {...props} />
      </ul>,
    );

  it('shows title, issuer, date, category and credential ID', () => {
    card({ category: 'Web', credentialId: 'ABC-123' });

    expect(screen.getByRole('heading', { level: 2, name: 'Web Basics' })).toBeInTheDocument();
    expect(screen.getByText('Example Academy')).toBeInTheDocument();
    expect(screen.getByText('Mar 2025')).toHaveAttribute('datetime', '2025-03');
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
  });

  it('shows no links, picture or credential ID when none are set', () => {
    card({});

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText(/credential id/i)).toBeNull();
  });

  it('shows an image certificate with an alt text that names it, lazy loaded', () => {
    card({ file: { url: '/certificates/web.png' } });

    const image = screen.getByRole('img', {
      name: 'Certificate "Web Basics" issued by Example Academy',
    });
    expect(image).toHaveAttribute('src', '/certificates/web.png');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('uses the alt text from the data when there is one', () => {
    card({ file: { url: '/certificates/web.png', alt: 'Certificate with a blue border' } });

    expect(screen.getByRole('img', { name: 'Certificate with a blue border' })).toBeInTheDocument();
  });

  it('shows a PDF as a symbol and says so in the link, with no embedded document', () => {
    const { container } = card({ file: { url: '/certificates/web.pdf' } });

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('iframe, embed, object')).toBeNull();
    const link = screen.getByRole('link', {
      name: 'View certificate for Web Basics (PDF, opens in a new tab)',
    });
    expect(link).toHaveAttribute('href', '/certificates/web.pdf');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('links to the issuer verification page in a new tab', () => {
    card({ credentialUrl: 'https://verify.example.org/abc' });

    const link = screen.getByRole('link', {
      name: 'Verify credential for Web Basics (opens in a new tab)',
    });
    expect(link).toHaveAttribute('href', 'https://verify.example.org/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('normalizeCertificates', () => {
  it('drops hidden, repeated and incomplete entries and impossible dates', () => {
    const result = make([
      entry({ id: 'ok' }),
      entry({ id: 'hidden', visible: false }),
      entry({ id: 'ok' }),
      entry({ id: 'no-title', title: ' ' }),
      entry({ id: 'no-issuer', issuer: undefined }),
      entry({ id: 'bad-date', issuedDate: '2025-13' }),
      entry({ id: 'year-only', issuedDate: '2025' }),
      entry({ id: '' }),
      null,
    ]);

    expect(result.map((certificate) => certificate.id)).toEqual(['ok']);
  });

  it('keeps only https credential links and safe file addresses', () => {
    const [unsafe] = make([
      entry({
        credentialUrl: 'javascript:alert(1)',
        file: { url: 'data:image/svg+xml,<svg/>' },
      }),
    ]);
    const [plainHttp] = make([entry({ credentialUrl: 'http://verify.example.org' })]);
    const [good] = make([
      entry({
        credentialUrl: 'https://verify.example.org',
        file: { url: 'https://cdn.example.org/a.pdf?x=1' },
      }),
    ]);

    expect(unsafe.credentialUrl).toBeNull();
    expect(unsafe.file).toBeNull();
    expect(plainHttp.credentialUrl).toBeNull();
    expect(good.credentialUrl).toBe('https://verify.example.org');
    expect(good.file.isPdf).toBe(true);
  });

  it('orders by sortOrder, then newest first, and copes with malformed data', () => {
    const result = make([
      entry({ id: 'old', issuedDate: '2023-01' }),
      entry({ id: 'new', issuedDate: '2025-01' }),
      entry({ id: 'first', issuedDate: '2020-01', sortOrder: -1 }),
    ]);

    expect(result.map((certificate) => certificate.id)).toEqual(['first', 'new', 'old']);
    expect(normalizeCertificates(undefined)).toEqual([]);
    expect(normalizeCertificates({ certificates: 'nope' })).toEqual([]);
  });

  it('accepts every entry of the shipped data file', () => {
    expect(normalizeCertificates(certificatesData)).toHaveLength(
      certificatesData.certificates.length,
    );
  });
});

describe('filterCertificates, getCertificateFilterOptions and isPdfAddress', () => {
  it('requires every given filter to match', () => {
    const certificates = THREE();

    expect(filterCertificates(certificates)).toHaveLength(3);
    expect(filterCertificates(certificates, { issuer: 'Acme', year: '2024' })).toEqual([]);
    expect(filterCertificates(certificates, { category: 'Web' })).toHaveLength(2);
  });

  it('lists each option once', () => {
    expect(getCertificateFilterOptions(THREE())).toEqual({
      issuers: ['Acme', 'Example Academy'],
      years: ['2025', '2024'],
      categories: ['Cloud', 'Web'],
    });
  });

  it('recognises PDF addresses, ignoring query and fragment', () => {
    expect(isPdfAddress('/a/b.PDF')).toBe(true);
    expect(isPdfAddress('https://x.org/a.pdf?download=1#page=2')).toBe(true);
    expect(isPdfAddress('/a/b.png')).toBe(false);
    expect(isPdfAddress('/a/pdf')).toBe(false);
  });
});
