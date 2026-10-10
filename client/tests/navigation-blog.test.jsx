import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';

// The article files normally come from shared/data/posts. Tests fill this list instead, so
// they do not depend on whether the real site has articles yet.
const files = vi.hoisted(() => []);
vi.mock('../src/services/postsSource.js', () => ({ postFiles: files }));

afterEach(() => {
  cleanup();
  files.length = 0;
});

function renderApp(path = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const blogLinks = (name) =>
  within(screen.getByRole('navigation', { name })).queryAllByRole('link', { name: 'Blog' });

describe('Blog link in the navigation', () => {
  it('is hidden in the header and the footer while there are no articles', () => {
    renderApp();

    expect(blogLinks('Main')).toHaveLength(0);
    expect(blogLinks('Footer')).toHaveLength(0);
  });

  it('still opens the blog page when its address is typed', () => {
    renderApp('/blog');

    expect(screen.getByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument();
  });

  it('appears in the header and the footer once an article is published', () => {
    files.push({
      path: '/shared/data/posts/hello.md',
      raw: '---\ntitle: Hello\npublishedAt: 2025-03-01\n---\nSome text.',
    });
    renderApp();

    expect(blogLinks('Main')).toHaveLength(1);
    expect(blogLinks('Footer')).toHaveLength(1);
  });
});
