import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import projectsData from '@portfolio/shared/data/projects.json';
import ArchitectureDiagram from '../src/components/sections/ArchitectureDiagram.jsx';
import { getProjects, normalizeProjects } from '../src/services/projectsService.js';
import { getSection, renderSite } from './helpers/renderSite.jsx';

vi.mock('../src/services/projectsService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getProjects: vi.fn(actual.getProjects) };
});

const realGetProjects = getProjects.getMockImplementation();

function makeProjects(entries) {
  return normalizeProjects({
    projects: entries.map((entry, index) => ({
      slug: `project-${index + 1}`,
      title: `Project ${index + 1}`,
      summary: `Summary ${index + 1}`,
      ...entry,
    })),
  });
}

// One project written for these tests, so they do not change when the real projects do.
const ONE = () =>
  makeProjects([
    {
      slug: 'portfolio-website',
      title: 'Portfolio Website',
      category: 'Full-Stack',
      status: 'in_progress',
      year: 2026,
      description: 'What it is.',
      problem: 'The problem.',
      solution: 'The solution.',
      features: ['Fast'],
      technologies: ['React'],
      architecture: {
        description: 'Layers.',
        layers: [
          { name: 'Frontend', detail: 'React' },
          { name: 'API', detail: 'Express' },
          { name: 'Backend', detail: 'Node' },
          { name: 'Database', detail: 'PostgreSQL' },
        ],
      },
    },
  ]);

const TWO = () =>
  makeProjects([
    { title: 'Shop', sortOrder: 1 },
    { title: 'Chat', sortOrder: 2 },
  ]);

const renderProjects = () => renderSite('/');
const section = () => getSection('Projects');
const study = (name) => within(section()).getByRole('article', { name });

beforeEach(() => {
  getProjects.mockReset().mockImplementation(realGetProjects);
});

describe('projects section', () => {
  beforeEach(() => {
    getProjects.mockImplementation(async () => ONE());
  });

  it('has its own heading and tells each project as an article under an h3', async () => {
    renderProjects();

    expect(screen.getByRole('heading', { level: 2, name: 'Projects' })).toBeInTheDocument();
    const article = await within(section()).findByRole('article', { name: 'Portfolio Website' });
    expect(within(article).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Portfolio Website',
    );
    expect(article).toHaveAttribute('id', 'project-portfolio-website');
  });

  it('shows status, category and year as text, and no links that are not set', async () => {
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Portfolio Website' });

    expect(article).toHaveTextContent('In progress');
    expect(article).toHaveTextContent('Full-Stack');
    expect(article).toHaveTextContent('2026');
    expect(within(article).queryByRole('link', { name: /github|live demo/i })).toBeNull();
  });

  it('shows the written parts in order, under h4 headings, and leaves out the empty ones', async () => {
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Portfolio Website' });

    const headings = within(article)
      .getAllByRole('heading', { level: 4 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Overview',
      'Problem',
      'Solution',
      'Features',
      'Technology stack',
      'Architecture',
    ]);
  });

  it('shows the architecture as Frontend, API, Backend, Database in order', async () => {
    renderProjects();

    const diagram = await within(section()).findByRole('list', { name: /layers/i });
    const names = within(diagram)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('strong').textContent);
    expect(names).toEqual(['Frontend', 'API', 'Backend', 'Database']);
  });

  it('shows every project one after another, in order, with no filters', async () => {
    getProjects.mockImplementation(async () => TWO());
    renderProjects();

    await within(section()).findByRole('article', { name: 'Shop' });
    const titles = within(section())
      .getAllByRole('article')
      .map((article) => within(article).getByRole('heading', { level: 3 }).textContent);
    expect(titles).toEqual(['Shop', 'Chat']);
    expect(within(section()).queryByRole('search')).toBeNull();
  });

  it('shows links, picture, screenshots and extra parts when a project has them', async () => {
    getProjects.mockImplementation(async () =>
      makeProjects([
        {
          title: 'Full',
          repoUrl: 'https://github.com/someone/repo',
          demoUrl: 'https://demo.example.org',
          thumbnail: { url: '/cover.png', alt: 'Home screen' },
          screenshots: [{ url: '/shot.png', alt: 'Login form', caption: 'Signing in' }],
          challenges: 'Hard part one.\n\nHard part two.',
          lessons: 'A lesson.',
        },
      ]),
    );
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Full' });

    const repo = within(article).getByRole('link', { name: /GitHub repository/ });
    expect(repo).toHaveAttribute('href', 'https://github.com/someone/repo');
    expect(repo).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(article).getByRole('link', { name: /Live demo/ })).toHaveAttribute(
      'href',
      'https://demo.example.org',
    );
    expect(within(article).getByRole('img', { name: 'Home screen' })).toBeInTheDocument();
    expect(within(article).getByRole('img', { name: 'Login form' })).toBeInTheDocument();
    expect(within(article).getByText('Signing in')).toBeInTheDocument();
    expect(within(article).getByText('Hard part two.')).toBeInTheDocument();
    expect(
      within(article).getByRole('heading', { level: 4, name: 'Lessons learned' }),
    ).toBeInTheDocument();
  });

  it('names the sub-headings of different projects apart (no repeated ids)', async () => {
    getProjects.mockImplementation(async () =>
      makeProjects([
        { title: 'A', technologies: ['React'], screenshots: [{ url: '/a.png', alt: 'A shot' }] },
        { title: 'B', technologies: ['Vite'], screenshots: [{ url: '/b.png', alt: 'B shot' }] },
      ]),
    );
    renderProjects();
    await within(section()).findByRole('article', { name: 'B' });

    const ids = [...section().querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      within(study('A')).getByRole('region', { name: 'Technology stack' }),
    ).toBeInTheDocument();
  });
});

describe('project index and facts', () => {
  it('numbers the case studies and links to each one from an index', async () => {
    getProjects.mockImplementation(async () => TWO());
    renderProjects();
    await within(section()).findByRole('article', { name: 'Shop' });

    const index = within(section()).getByRole('navigation', { name: 'Project index' });
    const links = within(index).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/#project-project-1',
      '/#project-project-2',
    ]);
    expect(index).toHaveTextContent('Shop');
    expect(index).toHaveTextContent('Chat');
  });

  it('has no index for a single project', async () => {
    getProjects.mockImplementation(async () => ONE());
    renderProjects();
    await within(section()).findByRole('article', { name: 'Portfolio Website' });

    expect(within(section()).queryByRole('navigation', { name: 'Project index' })).toBeNull();
  });

  it('lists category, year and status as facts', async () => {
    getProjects.mockImplementation(async () => ONE());
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Portfolio Website' });

    const terms = [...article.querySelectorAll('dt')].map((node) => node.textContent);
    expect(terms).toEqual(['Category', 'Year', 'Status']);
  });
});

describe('image viewer', () => {
  const withPictures = () =>
    makeProjects([
      {
        title: 'Gallery',
        thumbnail: { url: '/cover.png', alt: 'Cover picture', caption: 'The cover' },
        screenshots: [
          { url: '/one.png', alt: 'First screen', caption: 'Screen one' },
          { url: '/two.png', alt: 'Second screen', caption: '' },
        ],
      },
    ]);

  beforeEach(() => {
    getProjects.mockImplementation(async () => withPictures());
  });

  async function openFirst() {
    const user = userEvent.setup();
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Gallery' });
    const opener = within(article).getByRole('button', { name: 'Enlarge: Cover picture' });
    await user.click(opener);
    return { user, article, opener };
  }

  it('opens the cover in a viewer that says which picture of how many it shows', async () => {
    await openFirst();
    const viewer = screen.getByRole('dialog', { name: 'Image viewer' });

    expect(within(viewer).getByRole('img', { name: 'Cover picture' })).toBeInTheDocument();
    expect(viewer).toHaveTextContent('The cover');
    expect(viewer).toHaveTextContent('1 / 3');
    expect(within(viewer).getByRole('button', { name: 'Previous image' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('moves between pictures with the buttons and the arrow keys, and stops at the ends', async () => {
    const { user } = await openFirst();
    const viewer = screen.getByRole('dialog', { name: 'Image viewer' });

    await user.click(within(viewer).getByRole('button', { name: 'Next image' }));
    expect(within(viewer).getByRole('img', { name: 'First screen' })).toBeInTheDocument();
    expect(viewer).toHaveTextContent('2 / 3');

    await user.keyboard('{ArrowRight}');
    expect(within(viewer).getByRole('img', { name: 'Second screen' })).toBeInTheDocument();
    expect(within(viewer).getByRole('button', { name: 'Next image' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.keyboard('{ArrowRight}{ArrowLeft}{ArrowLeft}');
    expect(viewer).toHaveTextContent('1 / 3');
  });

  it('opens a screenshot at its own place in the list', async () => {
    const user = userEvent.setup();
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Gallery' });

    await user.click(within(article).getByRole('button', { name: 'Enlarge: Second screen' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('3 / 3');
  });

  it('closes with the close button and gives the page back', async () => {
    const { user } = await openFirst();
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Close viewer' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('closes on a click outside the picture but not on the picture itself', async () => {
    const { user } = await openFirst();
    const viewer = screen.getByRole('dialog');

    await user.click(within(viewer).getByRole('img', { name: 'Cover picture' }));
    expect(screen.queryByRole('dialog')).not.toBeNull();

    await user.click(viewer);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows no buttons to move when there is a single picture', async () => {
    getProjects.mockImplementation(async () =>
      makeProjects([{ title: 'Solo', thumbnail: { url: '/solo.png', alt: 'Only one' } }]),
    );
    const user = userEvent.setup();
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Solo' });

    await user.click(within(article).getByRole('button', { name: 'Enlarge: Only one' }));

    const viewer = screen.getByRole('dialog');
    expect(within(viewer).queryByRole('button', { name: /previous|next/i })).toBeNull();
    expect(viewer).not.toHaveTextContent('1 / 1');
  });
});

describe('before and after slider', () => {
  const withComparison = () =>
    makeProjects([
      {
        title: 'Redesign',
        comparison: {
          before: { url: '/old.png', alt: 'The old design', width: 1200, height: 750 },
          after: { url: '/new.png', alt: 'The new design', width: 1200, height: 750 },
          beforeLabel: 'v1',
          afterLabel: 'v2',
          caption: 'Old and new.',
        },
      },
    ]);

  it('shows both pictures with a slider that starts in the middle', async () => {
    getProjects.mockImplementation(async () => withComparison());
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Redesign' });

    expect(
      within(article).getByRole('heading', { level: 4, name: 'Before & after' }),
    ).toBeInTheDocument();
    expect(within(article).getByRole('img', { name: 'The old design' })).toBeInTheDocument();
    expect(within(article).getByRole('img', { name: 'The new design' })).toBeInTheDocument();
    expect(within(article).getByText('Old and new.')).toBeInTheDocument();
    const slider = within(article).getByRole('slider', { name: /v1 on the left, v2 on the right/ });
    expect(slider).toHaveValue('50');
  });

  it('moves with the keyboard and describes where the divider is', async () => {
    getProjects.mockImplementation(async () => withComparison());
    renderProjects();
    const slider = await within(section()).findByRole('slider');

    // jsdom does not move a range input with the keyboard, so the change is sent directly.
    fireEvent.change(slider, { target: { value: '0' } });
    expect(slider).toHaveAttribute('aria-valuetext', 'Showing only v2');
    fireEvent.change(slider, { target: { value: '100' } });
    expect(slider).toHaveAttribute('aria-valuetext', 'Showing only v1');
    fireEvent.change(slider, { target: { value: '99' } });
    expect(slider).toHaveAttribute('aria-valuetext', 'Divider at 99 percent');
  });

  it('is left out when a project has no comparison', async () => {
    getProjects.mockImplementation(async () => ONE());
    renderProjects();
    await within(section()).findByRole('article', { name: 'Portfolio Website' });

    expect(within(section()).queryByRole('slider')).toBeNull();
  });
});

describe('projects section states', () => {
  beforeEach(() => {
    getProjects.mockImplementation(async () => ONE());
  });

  it('announces loading, then shows the projects', async () => {
    renderProjects();

    expect(within(section()).getByRole('status')).toHaveTextContent('Loading projects');
    await within(section()).findByRole('article', { name: 'Portfolio Website' });
    expect(within(section()).queryByRole('status')).toBeNull();
  });

  it('shows a friendly error and recovers on Try again', async () => {
    const user = userEvent.setup();
    getProjects.mockRejectedValueOnce(new Error('secret internal detail'));
    renderProjects();

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('secret internal detail');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await within(section()).findByRole('article', { name: 'Portfolio Website' }),
    ).toBeInTheDocument();
  });

  it('shows an empty state when there are no projects', async () => {
    getProjects.mockResolvedValue([]);
    renderProjects();

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
  });
});

describe('comparison data', () => {
  const picture = (url) => ({ url, alt: url, width: 10, height: 10 });

  it('keeps a comparison with both pictures and fills in default labels', () => {
    const [project] = makeProjects([
      { comparison: { before: picture('/a.png'), after: picture('/b.png') } },
    ]);

    expect(project.comparison).toMatchObject({ beforeLabel: 'Before', afterLabel: 'After' });
  });

  it.each([
    ['no after picture', { before: picture('/a.png') }],
    [
      'a picture address that is not allowed',
      { before: picture('//evil.example'), after: picture('/b.png') },
    ],
    ['nothing', null],
  ])('drops a comparison with %s', (_name, comparison) => {
    const [project] = makeProjects([{ comparison }]);

    expect(project.comparison).toBeNull();
  });
});

describe('ArchitectureDiagram', () => {
  it('renders nothing without layers', () => {
    const { container } = render(<ArchitectureDiagram layers={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('normalizeProjects', () => {
  const base = { title: 'T', summary: 'S' };

  it('drops unpublished projects, unsafe or repeated slugs and entries without title or summary', () => {
    const result = normalizeProjects({
      projects: [
        { ...base, slug: 'good' },
        { ...base, slug: 'hidden', published: false },
        { ...base, slug: 'Bad Slug' },
        { ...base, slug: '../etc' },
        { ...base, slug: 'good' },
        { slug: 'no-title', summary: 'S' },
        { slug: 'no-summary', title: 'T' },
        null,
      ],
    });

    expect(result.map((project) => project.slug)).toEqual(['good']);
  });

  it('keeps only https links and image addresses that are safe', () => {
    const [project] = normalizeProjects({
      projects: [
        {
          ...base,
          slug: 'links',
          repoUrl: 'javascript:alert(1)',
          demoUrl: 'http://plain.example.org',
          thumbnail: { url: 'data:image/svg+xml,<svg/>' },
          screenshots: [{ url: '/ok.png' }, { url: 'javascript:alert(1)' }],
        },
      ],
    });

    expect(project.repoUrl).toBeNull();
    expect(project.demoUrl).toBeNull();
    expect(project.thumbnail).toBeNull();
    expect(project.screenshots.map((shot) => shot.url)).toEqual(['/ok.png']);
  });

  it('sorts by sortOrder and ignores an unknown status', () => {
    const result = normalizeProjects({
      projects: [
        { ...base, slug: 'b', sortOrder: 2, status: 'done-ish' },
        { ...base, slug: 'a', sortOrder: 1, status: 'completed' },
      ],
    });

    expect(result.map((project) => project.slug)).toEqual(['a', 'b']);
    expect(result.map((project) => project.status)).toEqual(['completed', null]);
  });

  it('returns an empty list for missing or malformed data', () => {
    expect(normalizeProjects(undefined)).toEqual([]);
    expect(normalizeProjects({ projects: 'nope' })).toEqual([]);
  });

  it('accepts every project in the shipped data file', () => {
    expect(normalizeProjects(projectsData)).toHaveLength(projectsData.projects.length);
  });
});

describe('shipped projects data', () => {
  it('has unique slugs', () => {
    const slugs = projectsData.projects.map((project) => project.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
