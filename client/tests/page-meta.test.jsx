import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import PageTitle from '../src/components/layout/PageTitle.jsx';
import { PAGE_DESCRIPTIONS } from '../src/utils/pageDescriptions.js';

const meta = (name) => document.head.querySelector(`meta[name="${name}"]`);

function renderAt(path) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('PageTitle', () => {
  it('sets the title, a description and no robots tag by default', () => {
    render(<PageTitle title="Skills" description="About skills." />);

    expect(document.title).toBe(`Skills | ${siteConfig.name}`);
    expect(meta('description')).toHaveAttribute('content', 'About skills.');
    expect(meta('robots')).toBeNull();
  });

  it('asks search engines to skip the page when noIndex is set', () => {
    render(<PageTitle title="Missing" noIndex />);

    expect(meta('robots')).toHaveAttribute('content', 'noindex');
  });
});

describe('pages', () => {
  it('describes the home page, which is the whole site, and can be indexed', () => {
    renderAt('/');

    expect(meta('description')).toHaveAttribute('content', PAGE_DESCRIPTIONS.home);
    expect(meta('robots')).toBeNull();
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it('describes the home page for an old address that now redirects to it', () => {
    renderAt('/projects');

    expect(meta('description')).toHaveAttribute('content', PAGE_DESCRIPTIONS.home);
  });

  it('keeps a page that does not exist out of search results', () => {
    renderAt('/no-such-page');

    expect(meta('robots')).toHaveAttribute('content', 'noindex');
  });
});
