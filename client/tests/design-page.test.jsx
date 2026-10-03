import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import DesignPage from '../src/pages/dev/DesignPage.jsx';

function renderDesignPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <DesignPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('DesignPage', () => {
  it('renders every section without crashing', () => {
    renderDesignPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Design system' })).toBeInTheDocument();
    for (const name of ['Colors', 'Typography', 'Spacing', 'Form fields']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('has exactly one h1 and never skips a heading level', () => {
    renderDesignPage();

    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName[1]));

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    levels.forEach((level, index) => {
      if (index > 0) {
        expect(level).toBeLessThanOrEqual(levels[index - 1] + 1);
      }
    });
  });
});
