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
  it.each([
    ['/', PAGE_DESCRIPTIONS.home],
    ['/about', PAGE_DESCRIPTIONS.about],
    ['/projects', PAGE_DESCRIPTIONS.projects],
    ['/contact', PAGE_DESCRIPTIONS.contact],
  ])('%s has its own description and can be indexed', (path, description) => {
    renderAt(path);

    expect(meta('description')).toHaveAttribute('content', description);
    expect(meta('robots')).toBeNull();
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it('keeps a page that does not exist out of search results', () => {
    renderAt('/no-such-page');

    expect(meta('robots')).toHaveAttribute('content', 'noindex');
  });
});
