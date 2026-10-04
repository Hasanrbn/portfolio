import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import PostBody from '../src/components/sections/PostBody.jsx';
import PostContent from '../src/components/sections/PostContent.jsx';
import ShareButtons from '../src/components/sections/ShareButtons.jsx';
import { getPosts } from '../src/services/postsService.js';

// The article files normally come from shared/data/posts. Tests fill this list instead.
const files = vi.hoisted(() => []);
vi.mock('../src/services/postsSource.js', () => ({ postFiles: files }));
vi.mock('../src/services/postsService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getPosts: vi.fn(actual.getPosts) };
});
const realGetPosts = getPosts.getMockImplementation();

function addPost(slug, meta = {}, body = 'Some text.') {
  const header = Object.entries({ title: `Post ${slug}`, publishedAt: '2025-03-01', ...meta })
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  files.push({ path: `/shared/data/posts/${slug}.md`, raw: `---\n${header}\n---\n${body}` });
}

function renderAt(path) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const main = () => screen.getByRole('main');
const cardTitles = () =>
  within(main())
    .queryAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);

beforeEach(() => {
  files.length = 0;
  getPosts.mockReset().mockImplementation(realGetPosts);
});

describe('blog page', () => {
  it('shows an honest empty state while there are no articles', async () => {
    renderAt('/blog');

    expect(screen.getByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No articles yet' })).toBeInTheDocument();
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('announces loading, and shows a friendly error that recovers on Try again', async () => {
    const user = userEvent.setup();
    getPosts.mockRejectedValueOnce(new Error('secret internal detail'));
    renderAt('/blog');

    expect(screen.getByRole('status')).toHaveTextContent('Loading articles');
    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('secret internal detail');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'No articles yet' })).toBeVisible();
  });

  it('lists articles newest first with date, reading time, category and tags, linking to each', async () => {
    addPost('older', {
      publishedAt: '2025-01-05',
      category: 'Web',
      tags: 'React, Vite',
      excerpt: 'First notes.',
    });
    addPost('newer', { publishedAt: '2025-06-09' });
    renderAt('/blog');

    const link = await screen.findByRole('link', { name: 'Post newer' });
    expect(link).toHaveAttribute('href', '/blog/newer');
    expect(cardTitles()).toEqual(['Post newer', 'Post older']);

    const card = screen.getByRole('heading', { name: 'Post older' }).closest('li');
    expect(card).toHaveTextContent('Jan 5, 2025');
    expect(card).toHaveTextContent('1 min read');
    expect(card).toHaveTextContent('Web');
    expect(card).toHaveTextContent('First notes.');
    expect(within(card).getByRole('list', { name: 'Tags' })).toHaveTextContent('ReactVite');
  });

  it('shows one article without filters', async () => {
    addPost('only');
    renderAt('/blog');

    expect(await screen.findByRole('link', { name: 'Post only' })).toBeVisible();
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('narrows by search text, category and tag, and clears from the empty state', async () => {
    const user = userEvent.setup();
    addPost('a', {
      title: 'React hooks',
      category: 'Web',
      tags: 'React',
      publishedAt: '2025-03-03',
    });
    addPost('b', {
      title: 'Linux notes',
      category: 'Tools',
      tags: 'Linux',
      publishedAt: '2025-03-02',
    });
    addPost('c', {
      title: 'Express tips',
      category: 'Web',
      tags: 'Express',
      publishedAt: '2025-03-01',
    });
    renderAt('/blog');
    await screen.findByRole('link', { name: 'React hooks' });
    expect(screen.getByRole('status')).toHaveTextContent('3 articles');

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'linux');
    expect(cardTitles()).toEqual(['Linux notes']);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 3 articles');

    await user.clear(screen.getByRole('searchbox', { name: 'Search' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Web');
    expect(cardTitles()).toEqual(['React hooks', 'Express tips']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tag' }), 'Express');
    expect(cardTitles()).toEqual(['Express tips']);

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzz');
    const empty = screen.getByRole('heading', { name: 'No articles match' }).parentElement;
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }));
    expect(cardTitles()).toHaveLength(3);
  });

  it('starts from the filters in the address and ignores unknown values', async () => {
    addPost('a', { tags: 'React' });
    addPost('b', { tags: 'Linux', publishedAt: '2025-02-01' });
    renderAt('/blog?tag=Linux&category=Nope');

    await screen.findByRole('link', { name: 'Post b' });
    expect(cardTitles()).toEqual(['Post b']);
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
  });

  describe('pages', () => {
    beforeEach(() => {
      for (let n = 1; n <= 8; n += 1) {
        addPost(`p${n}`, { publishedAt: `2025-03-0${n}`, tags: n <= 4 ? 'Even' : 'Odd' });
      }
    });

    it('shows six articles a page with Previous and Next links that keep the filters', async () => {
      const user = userEvent.setup();
      renderAt('/blog');
      await screen.findByRole('link', { name: 'Post p8' });

      expect(cardTitles()).toHaveLength(6);
      const nav = screen.getByRole('navigation', { name: 'Pagination' });
      expect(nav).toHaveTextContent('Page 1 of 2');
      expect(within(nav).queryByRole('link', { name: /previous/i })).toBeNull();

      await user.click(within(nav).getByRole('link', { name: /next/i }));
      expect(cardTitles()).toEqual(['Post p2', 'Post p1']);
      expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent(
        'Page 2 of 2',
      );
    });

    it('moves an impossible page number to the last page', async () => {
      renderAt('/blog?page=99');

      await screen.findByRole('link', { name: 'Post p1' });
      expect(cardTitles()).toEqual(['Post p2', 'Post p1']);
    });

    it('goes back to the first page when a filter changes', async () => {
      const user = userEvent.setup();
      renderAt('/blog?page=2');
      await screen.findByRole('link', { name: 'Post p1' });

      await user.selectOptions(screen.getByRole('combobox', { name: 'Tag' }), 'Odd');

      expect(cardTitles()).toEqual(['Post p8', 'Post p7', 'Post p6', 'Post p5']);
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    });
  });
});

describe('article page', () => {
  const LONG = [
    '# Intro',
    'First paragraph with `code` and a [site link](https://example.org).',
    '## Setup',
    'Text.',
    '### Install',
    'More text.',
    '## Setup',
    'Again.',
  ].join('\n\n');

  it('shows the title, meta, text, tags, share buttons and a way back', async () => {
    addPost(
      'hello',
      { tags: 'React', category: 'Web', updatedAt: '2025-04-02' },
      'Hello **world**.',
    );
    renderAt('/blog/hello');

    expect(await screen.findByText('world')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Post hello' })).toBeInTheDocument();
    expect(main()).toHaveTextContent('Mar 1, 2025');
    expect(main()).toHaveTextContent('Updated Apr 2, 2025');
    expect(main()).toHaveTextContent('1 min read');
    expect(screen.getByRole('link', { name: 'All articles' })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('list', { name: 'Tags' })).toHaveTextContent('React');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Share this article' }),
    ).toBeInTheDocument();
    expect(document.title).toMatch(/^Post hello \|/);
  });

  it('adds a table of contents with working links for long articles only', async () => {
    addPost('long', {}, LONG);
    addPost('short', {}, '## One\n\ntext\n\n## Two\n\ntext');
    const { unmount } = renderAt('/blog/long');

    const toc = await screen.findByRole('navigation', { name: 'Table of contents' });
    const links = within(toc).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Intro', 'Setup', 'Install', 'Setup']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#intro',
      '#setup',
      '#install',
      '#setup-2',
    ]);
    links.forEach((link) => {
      expect(main().querySelector(link.getAttribute('href'))).not.toBeNull();
    });
    unmount();

    renderAt('/blog/short');
    await screen.findByRole('heading', { level: 2, name: 'One' });
    expect(screen.queryByRole('navigation', { name: 'Table of contents' })).toBeNull();
  });

  it('keeps heading levels in order: the title is the only h1', async () => {
    addPost('long', {}, LONG);
    renderAt('/blog/long');
    await screen.findByRole('navigation', { name: 'Table of contents' });

    const levels = within(main())
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName[1]));
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    levels.slice(1).forEach((level, index) => expect(level - levels[index]).toBeLessThanOrEqual(1));
  });

  it('suggests related articles that share tags, and none when nothing is shared', async () => {
    addPost('main', { tags: 'React, Vite' });
    addPost('friend', { tags: 'React', publishedAt: '2025-02-01' });
    addPost('stranger', { tags: 'Linux', publishedAt: '2025-01-01' });
    renderAt('/blog/main');

    const related = await screen.findByRole('region', { name: 'Related articles' });
    expect(within(related).getByRole('link', { name: 'Post friend' })).toBeInTheDocument();
    expect(within(related).queryByRole('link', { name: 'Post stranger' })).toBeNull();
  });

  it('opens from the list and moves focus to the heading', async () => {
    const user = userEvent.setup();
    addPost('hello');
    renderAt('/blog');

    await user.click(await screen.findByRole('link', { name: 'Post hello' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Post hello' });
    expect(heading).toHaveFocus();
  });

  it('says so, with a way back, when there is no article at the address', async () => {
    renderAt('/blog/missing');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Article not found' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to the blog' })).toHaveAttribute('href', '/blog');
  });
});

describe('article text is treated as untrusted', () => {
  const renderContent = (markdown) =>
    render(
      <MemoryRouter>
        <PostContent content={markdown} />
      </MemoryRouter>,
    );

  it('never turns raw HTML into elements', () => {
    const { container } = renderContent(
      'Before\n\n<script>window.hacked = true</script>\n\n<img src="x" onerror="window.hacked = true">\n\nAfter',
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(window.hacked).toBeUndefined();
    expect(container).toHaveTextContent('After');
  });

  it('does not link script or plain http addresses, and opens https ones safely', () => {
    renderContent(
      '[bad](javascript:alert(1)) [plain](http://example.org) [good](https://example.org) [inside](/projects) [top](#intro)',
    );

    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'plain' })).toBeNull();
    const good = screen.getByRole('link', { name: 'good (opens in a new tab)' });
    expect(good).toHaveAttribute('target', '_blank');
    expect(good).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'inside' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'top' })).toHaveAttribute('href', '#intro');
  });

  it('shows only pictures from this site or https, lazily, with their alt text', () => {
    const { container } = renderContent(
      '![ok](/images/a.png) ![remote](https://example.org/b.png) ![bad](data:image/svg+xml,xx) ![script](javascript:alert(1))',
    );

    const images = container.querySelectorAll('img');
    expect([...images].map((image) => image.getAttribute('alt'))).toEqual(['ok', 'remote']);
    images.forEach((image) => expect(image).toHaveAttribute('loading', 'lazy'));
  });

  it('shows "#" as a second-level heading and lets a wide code block be scrolled with the keyboard', () => {
    const { container } = renderContent('# Big\n\n```js\nconst a = 1;\n```');

    expect(screen.getByRole('heading', { level: 2, name: 'Big' })).toHaveAttribute('id', 'big');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(container.querySelector('pre')).toHaveAttribute('tabindex', '0');
  });
});

describe('PostBody', () => {
  it('shows the table of contents only from three sections on', () => {
    const { rerender } = render(<PostBody content={'## A\n\ntext\n\n## B\n\ntext'} />);
    expect(screen.queryByRole('navigation', { name: 'Table of contents' })).toBeNull();

    rerender(<PostBody content={'## A\n\ntext\n\n## B\n\ntext\n\n## C\n\ntext'} />);
    expect(screen.getByRole('navigation', { name: 'Table of contents' })).toBeInTheDocument();
  });
});

describe('ShareButtons', () => {
  const url = 'https://example.org/blog/hello world';
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset();
  });

  // userEvent.setup() installs its own clipboard, so ours is put in place after it.
  function setupUser(options) {
    const user = userEvent.setup(options);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    return user;
  }

  it('copies the address and says so', async () => {
    const user = setupUser();
    writeText.mockResolvedValue();
    render(<ShareButtons title="Hello" url={url} />);

    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith(url);
    expect(await screen.findByText('Link copied.')).toBeInTheDocument();
  });

  it('says so, with what to do instead, when copying is not possible', async () => {
    const user = setupUser();
    writeText.mockRejectedValue(new Error('denied'));
    render(<ShareButtons title="Hello" url={url} />);

    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(await screen.findByText(/could not be copied/i)).toBeInTheDocument();
  });

  it('forgets the message after a few seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = setupUser({ advanceTimers: vi.advanceTimersByTime });
    writeText.mockResolvedValue();
    render(<ShareButtons title="Hello" url={url} />);

    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    await screen.findByText('Link copied.');
    await act(async () => {
      vi.advanceTimersByTime(4500);
    });

    await waitFor(() => expect(screen.queryByText('Link copied.')).toBeNull());
    vi.useRealTimers();
  });

  it('opens LinkedIn and X in a new tab with the address and title encoded', () => {
    render(<ShareButtons title="Hello & more" url={url} />);

    const linkedin = screen.getByRole('link', { name: /Share on LinkedIn/ });
    expect(linkedin).toHaveAttribute(
      'href',
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    );
    const x = screen.getByRole('link', { name: /Share on X/ });
    expect(x.getAttribute('href')).toContain('text=Hello%20%26%20more');
    expect(x.getAttribute('href')).toContain(`url=${encodeURIComponent(url)}`);
    [linkedin, x].forEach((link) => expect(link).toHaveAttribute('rel', 'noopener noreferrer'));
  });
});
