import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '../../src/app/App.jsx';
import ThemeProvider from '../../src/app/ThemeProvider.jsx';

/** Renders the whole site at an address, the way a visitor opening it would get it. */
export function renderSite(path = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** The section of the one-page site with this heading, as a landmark region. */
export function getSection(name) {
  return screen.getByRole('region', { name });
}
